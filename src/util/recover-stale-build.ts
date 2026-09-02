import { mainWindow } from "../common/dom/get_main_window";
import { promiseTimeout } from "../common/util/promise-timeout";
import { fireExternalBusMessage } from "../external_app/external_messaging";
import * as staleBuildPatterns from "./stale-build-patterns.json";
import { showToast } from "./toast";

// Patterns live in a JSON single source (stale-build-patterns.json) so the
// build can inject the exact same ones into the inline boot-time guard
// (src/html/_bootstrap_recovery.html.template), which runs before any bundle
// loads and therefore cannot import from here.
const patterns = ((staleBuildPatterns as any).default ??
  staleBuildPatterns) as {
  hashedEntry: string;
  moduleError: string;
  anyUrl: string;
};
const HASHED_ENTRY = new RegExp(patterns.hashedEntry, "i");
// The same pattern anchored: a URL is ours only when it *is* an entry path, not
// when it merely contains one (/local/frontend_latest/custom.abc12345.js).
const HASHED_PATH = new RegExp(`^(?:${patterns.hashedEntry})$`, "i");
const MODULE_ERROR = new RegExp(patterns.moduleError, "i");
// Any file reference, to tell "a file we do not ship failed" apart from "the
// browser did not say which file failed".
const ANY_URL = new RegExp(patterns.anyUrl, "i");

const RELOAD_STORAGE_KEY = "haStaleBuildReload";
const RELOAD_COOLDOWN = 60_000;
// Reuse the service worker update toast id so we never show two competing
// "new version available" toasts (see register-service-worker.ts).
const UPDATE_TOAST_ID = "frontend-update-available";

let reloading = false;
let toastShown = false;

/**
 * True when the given string looks like a failed load of a content-hashed
 * frontend chunk — i.e. a stale build referencing files that no longer exist
 * on the server after an upgrade. Accepts either a URL (from a resource
 * `error` event) or an error message (from a rejected dynamic `import()`).
 */
export const isStaleBuildError = (
  urlOrMessage: string | undefined
): urlOrMessage is string =>
  !!urlOrMessage &&
  (HASHED_ENTRY.test(urlOrMessage) || MODULE_ERROR.test(urlOrMessage));

type ChunkVerdict = "gone" | "present" | "unknown";

// How long a "this one is still there" verdict stands, so a burst of failures
// for the same chunk asks the server once.
const PROBE_SUPPRESS = 10_000;
const PROBE_TIMEOUT = 5_000;

// Both keyed by chunk URL: during a deploy some chunks can be gone while others
// are still served, so one chunk's verdict must not answer for another.
const pendingProbes = new Map<string, Promise<boolean>>();
const probedPresent = new Map<string, number>();

/**
 * The file a failure is about: its absolute URL when this build ships it,
 * `"foreign"` for anything else (a dashboard resource, an extra_module_url, a
 * custom panel), or `undefined` when no file was named.
 */
const failedFile = (urlOrMessage: string): string | "foreign" | undefined => {
  const match = ANY_URL.exec(urlOrMessage);
  if (!match) {
    return undefined;
  }
  try {
    const url = new URL(match[0], location.href);
    if (url.origin === location.origin && HASHED_PATH.test(url.pathname)) {
      return url.href;
    }
  } catch (_err) {
    // Not a URL after all.
  }
  return "foreign";
};

// Remember a chunk the server still has, dropping verdicts that have expired.
const rememberPresent = (url: string): void => {
  const now = Date.now();
  probedPresent.forEach((until, key) => {
    if (until <= now) {
      probedPresent.delete(key);
    }
  });
  probedPresent.set(url, now + PROBE_SUPPRESS);
};

/**
 * A hashed file of the running build, to probe when the browser did not name
 * the one that failed. They all live or die with the build.
 */
const referenceUrl = (): string | undefined => {
  try {
    const entries = performance.getEntriesByType("resource");
    for (let i = entries.length - 1; i >= 0; i--) {
      const { name } = entries[i];
      const url = new URL(name, location.href);
      if (url.origin === location.origin && HASHED_PATH.test(url.pathname)) {
        return url.href;
      }
    }
  } catch (_err) {
    // ignore
  }
  return undefined;
};

/**
 * Ask the server whether the chunk is really gone.
 *
 * A failed module load looks identical whether the file was deleted by an
 * upgrade or the request never reached the server, and only the first is helped
 * by dropping the caches and reloading — on a transient failure that throws
 * away the cache that could have served the chunk.
 *
 * HEAD is never intercepted by the service worker (workbox routes GET only), so
 * the answer reflects what the server actually has. A server that refuses HEAD
 * outright leaves us with no answer, and no answer means no recovery: a GET
 * cannot substitute, because the frontend_latest route is CacheFirst with
 * `ignoreSearch`, so a controlling worker can answer it from its own cache.
 */
const askServer = async (
  url: string,
  signal?: AbortSignal
): Promise<ChunkVerdict> => {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal,
    });
    if (response.status === 404 || response.status === 410) {
      return "gone";
    }
    // A 5xx or a proxy error page says nothing about the file being deleted.
    return response.ok ? "present" : "unknown";
  } catch (_err) {
    // Aborted, offline, connection reset: unreachable, not stale.
    return "unknown";
  }
};

const probeChunk = async (url: string): Promise<ChunkVerdict> => {
  const controller =
    typeof AbortController === "undefined" ? undefined : new AbortController();
  try {
    // Timed out rather than relying on the abort alone: without
    // AbortController a stalled request would never settle, pinning the probe.
    const verdict: ChunkVerdict = await promiseTimeout(
      PROBE_TIMEOUT,
      askServer(url, controller?.signal)
    );
    return verdict;
  } catch (_err) {
    if (controller) {
      controller.abort();
    }
    return "unknown";
  }
};

const dropCachesAndReload = async (bust: number): Promise<void> => {
  // A service worker serves chunks CacheFirst (with `ignoreSearch`), so a
  // cache-busting navigation alone would still be answered from the stale
  // cache. Drop the worker and its caches first, then navigate with a
  // cache-busting query so a fresh index.html is fetched. (Android's WebView
  // has a service worker, so this path recovers it too.)
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    } catch (_err) {
      // ignore
    }
    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (_err) {
        // ignore
      }
    }
  }

  const url = new URL(mainWindow.location.href);
  url.searchParams.set("ha_cache_bust", String(bust));
  mainWindow.location.replace(url.href);
};

/**
 * Reload the page onto the current build.
 *
 * Returns `true` when a reload was actually initiated, `false` when the loop
 * guard blocked it — so callers can fall back to logging / an error screen
 * instead of silently swallowing a still-failing chunk.
 *
 * Guarded by a monotonic sessionStorage counter — NOT the boot guard's URL
 * param, which core.ts strips on every successful connect — so a recovery that
 * boots and then immediately re-triggers the same missing chunk (a deep-linked
 * panel, more-info from the URL, or a preloaded route) cannot reload-loop.
 */
export const reloadFresh = (): boolean => {
  if (reloading) {
    return false;
  }
  const now = Date.now();
  let attempts = 0;
  let last = 0;
  let storageOk = true;
  try {
    const stored = sessionStorage.getItem(RELOAD_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      attempts = Number(parsed.n) || 0;
      last = Number(parsed.t) || 0;
    }
  } catch (_err) {
    storageOk = false;
  }
  if (now - last > RELOAD_COOLDOWN) {
    attempts = 0;
  }
  if (attempts >= 1) {
    // Already reloaded once recently and it still failed: stop, to avoid a
    // reload loop on a genuinely broken (not merely stale) deploy.
    return false;
  }
  try {
    sessionStorage.setItem(
      RELOAD_STORAGE_KEY,
      JSON.stringify({ n: attempts + 1, t: now })
    );
  } catch (_err) {
    storageOk = false;
  }
  if (!storageOk) {
    // Without a durable cooldown marker (e.g. private mode) we can't stop a
    // loop across reloads, so fail closed rather than risk reloading forever.
    return false;
  }
  reloading = true;

  // `frontend/reload_and_clear_cache` is a WKWebView (iOS/macOS companion)
  // command; the Android bridges (externalApp/externalAppV2) don't handle it.
  // Only send it to the WebKit bridge — everything else takes the browser
  // path below (Android's WebView has a service worker, so it recovers there).
  if (window.webkit?.messageHandlers?.externalBus) {
    fireExternalBusMessage({ type: "frontend/reload_and_clear_cache" });
    return true;
  }

  // Fire and forget; the page navigates away once it resolves.
  void dropCachesAndReload(now);
  return true;
};

const showStaleBuildToast = (rootEl?: HTMLElement): void => {
  if (toastShown) {
    return;
  }
  const el =
    rootEl ??
    (mainWindow.document.querySelector("home-assistant") as HTMLElement | null);
  if (!el) {
    // Nowhere to anchor the toast yet; a later trigger can retry.
    return;
  }
  toastShown = true;
  // This toast is only shown while an editor is dirty, so it deliberately has
  // no immediate-reload action that could discard unsaved work: it reloads
  // automatically once the user saves or discards.
  const reloadWhenClean = () => {
    if (!window.isDirtyState) {
      window.removeEventListener("dirty-state-changed", reloadWhenClean);
      reloadFresh();
    }
  };
  window.addEventListener("dirty-state-changed", reloadWhenClean);
  showToast(el, {
    id: UPDATE_TOAST_ID,
    message: {
      translationKey: "ui.notification_toast.new_version_available_reload",
    },
    duration: -1,
    dismissable: false,
  });
};

/**
 * Reload onto the current build, but never over unsaved work: when an editor
 * is dirty, show a non-dismissable toast and defer the reload until the dirty
 * state clears. Returns `true` when a reload or the deferral toast was started.
 */
export const reloadForUpdate = (rootEl?: HTMLElement): boolean => {
  if (window.isDirtyState) {
    showStaleBuildToast(rootEl);
    return true;
  }
  return reloadFresh();
};

/**
 * Recover from a failed lazy load caused by a stale build (a content-hashed
 * chunk that 404s after an upgrade while the app stayed open).
 *
 * The chunk is probed first: one that is still on the server failed in
 * transport, which a cache-dropping reload cannot fix and would make worse, so
 * that case is left to the caller to surface.
 *
 * On a confirmed stale build:
 * - clean: reload onto the current build.
 * - dirty (an editor has unsaved changes): show a non-dismissable toast and
 *   auto-reload once the user saves/discards, so unsaved work is never lost.
 *
 * Returns `false` when the error is not a chunk-load failure, names a file this
 * build does not ship, or a recent probe already found the build intact.
 * Otherwise a promise — shared across a burst — resolving `true` when recovery
 * started (the caller can skip its own error UI / logging) and `false` when the
 * chunk was reachable or the loop guard blocked the reload.
 */
export const recoverFromStaleBuild = (
  urlOrMessage: string | undefined,
  rootEl?: HTMLElement
): false | Promise<boolean> => {
  // In dev/demo the entry files are unhashed and rebuild churn can throw
  // transient import errors; never auto-reload there.
  if (__DEV__ || __DEMO__) {
    return false;
  }
  if (!isStaleBuildError(urlOrMessage)) {
    return false;
  }
  const failed = failedFile(urlOrMessage);
  if (failed === "foreign") {
    // Those fail on their own schedule and say nothing about the build being
    // stale, so reloading over them never ends.
    return false;
  }
  // Nothing named (Safari's message names no file): ask about the build itself.
  const url = failed ?? referenceUrl();
  if (!url) {
    // No evidence at all — never drop caches on a guess.
    return false;
  }
  const now = Date.now();
  const suppressed = probedPresent.get(url);
  if (suppressed !== undefined && suppressed > now) {
    return false;
  }
  const pending = pendingProbes.get(url);
  if (pending) {
    return pending;
  }
  const probe = probeChunk(url)
    .then((verdict) => {
      if (verdict !== "gone") {
        rememberPresent(url);
        return false;
      }
      return reloadForUpdate(rootEl);
    })
    .finally(() => {
      pendingProbes.delete(url);
    });
  pendingProbes.set(url, probe);
  return probe;
};
