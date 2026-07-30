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

/**
 * Reload the page onto the current build.
 *
 * While a service worker controls the page its chunks are served CacheFirst
 * (with `ignoreSearch`), so a cache-busting navigation alone would still be
 * answered from the stale cache. We therefore first drop the worker and its
 * caches, then navigate with a cache-busting query so the browser / proxy /
 * WKWebView fetches a fresh index.html.
 *
 * Guarded by a monotonic sessionStorage counter — NOT the boot guard's URL
 * param, which core.ts strips on every successful connect — so a recovery that
 * boots and then immediately re-triggers the same missing chunk (a deep-linked
 * panel, more-info from the URL, or a preloaded route) cannot reload-loop.
 */
export const reloadFresh = async (): Promise<void> => {
  if (reloading) {
    return;
  }
  const now = Date.now();
  let attempts = 0;
  let last = 0;
  try {
    const stored = sessionStorage.getItem(RELOAD_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      attempts = Number(parsed.n) || 0;
      last = Number(parsed.t) || 0;
    }
  } catch (_err) {
    // sessionStorage unavailable (e.g. privacy mode); best-effort only.
  }
  if (now - last > RELOAD_COOLDOWN) {
    attempts = 0;
  }
  if (attempts >= 1) {
    // Already reloaded once recently and it still failed: stop, to avoid a
    // reload loop on a genuinely broken (not merely stale) deploy.
    return;
  }
  reloading = true;
  try {
    sessionStorage.setItem(
      RELOAD_STORAGE_KEY,
      JSON.stringify({ n: attempts + 1, t: now })
    );
  } catch (_err) {
    // ignore
  }

  // In the companion app (WKWebView) there is no service worker, and its
  // top-level document HTTP cache is not cleared by the Cache API — so the
  // web-level recovery below is ineffective there. Ask the native app to
  // purge its cache and reload the web view instead. Returns false (and falls
  // through to the browser path) when no external bridge is present.
  if (fireExternalBusMessage({ type: "frontend/reload_and_clear_cache" })) {
    return;
  }

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
  url.searchParams.set("ha_cache_bust", String(now));
  mainWindow.location.replace(url.href);
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
  // Auto-reload as soon as the user is no longer editing, so we never destroy
  // unsaved work but still get them onto the current build promptly.
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
    action: {
      action: () => reloadFresh(),
      primary: true,
      text: { translationKey: "ui.notification_toast.update_now" },
    },
    duration: -1,
    dismissable: false,
  });
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
 * started, so callers can skip their own error UI / logging.
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
  if (window.isDirtyState) {
    showStaleBuildToast(rootEl);
  } else {
    reloadFresh();
  }
  return true;
};
