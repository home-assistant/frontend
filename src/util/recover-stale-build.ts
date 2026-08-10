import { mainWindow } from "../common/dom/get_main_window";
import { fireExternalBusMessage } from "../external_app/external_messaging";
import * as staleBuildPatterns from "./stale-build-patterns.json";
import { showToast } from "./toast";

// Patterns live in a JSON single source (stale-build-patterns.json) so the
// build can inject the exact same ones into the inline boot-time guard
// (src/html/_bootstrap_recovery.html.template), which runs before any bundle
// loads and therefore cannot import from here.
const patterns = ((staleBuildPatterns as any).default ??
  staleBuildPatterns) as { hashedEntry: string; moduleError: string };
const HASHED_ENTRY = new RegExp(patterns.hashedEntry, "i");
const MODULE_ERROR = new RegExp(patterns.moduleError, "i");

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
export const isStaleBuildError = (urlOrMessage: string | undefined): boolean =>
  !!urlOrMessage &&
  (HASHED_ENTRY.test(urlOrMessage) || MODULE_ERROR.test(urlOrMessage));

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
 * - clean: reload onto the current build.
 * - dirty (an editor has unsaved changes): show a non-dismissable toast and
 *   auto-reload once the user saves/discards, so unsaved work is never lost.
 *
 * Returns `true` when the error was a stale-build error and recovery was
 * actually started, so callers can skip their own error UI / logging. Returns
 * `false` for a non-stale error, or when the loop guard blocked the reload (so
 * the caller still surfaces/logs the failure).
 */
export const recoverFromStaleBuild = (
  urlOrMessage: string | undefined,
  rootEl?: HTMLElement
): boolean => {
  // In dev/demo the entry files are unhashed and rebuild churn can throw
  // transient import errors; never auto-reload there.
  if (__DEV__ || __DEMO__) {
    return false;
  }
  if (!isStaleBuildError(urlOrMessage)) {
    return false;
  }
  return reloadForUpdate(rootEl);
};
