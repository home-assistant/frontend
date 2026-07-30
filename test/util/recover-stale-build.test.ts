import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShowToastParams } from "../../src/managers/notification-manager";
import type {
  isStaleBuildError,
  recoverFromStaleBuild,
} from "../../src/util/recover-stale-build";

interface RecoverModule {
  isStaleBuildError: typeof isStaleBuildError;
  recoverFromStaleBuild: typeof recoverFromStaleBuild;
}

const STALE_URL = "/frontend_latest/core.abc12345.js";
// Set by reloadFresh() right before it navigates; used here to observe that
// the reload path ran without having to mock window.location (jsdom forbids
// redefining it).
const RELOAD_KEY = "haStaleBuildReload";

describe("recover-stale-build", () => {
  let mod: RecoverModule;
  let root: HTMLElement;
  let notifications: ShowToastParams[];
  let serviceWorkerDescriptor: PropertyDescriptor | undefined;

  const latestNotification = () => notifications[notifications.length - 1];
  const reloadMarker = () => sessionStorage.getItem(RELOAD_KEY);

  beforeEach(async () => {
    globalThis.__DEV__ = false;
    globalThis.__DEMO__ = false;
    window.isDirtyState = false;
    sessionStorage.clear();

    // No controlling service worker → reloadFresh() takes the synchronous
    // path (no unregister/caches work) straight to the (jsdom no-op) navigate.
    serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "serviceWorker"
    );
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: null },
    });

    // Capture toasts fired via showToast (a "hass-notification" event).
    notifications = [];
    root = document.createElement("home-assistant");
    root.addEventListener("hass-notification", (event) => {
      notifications.push((event as CustomEvent<ShowToastParams>).detail);
    });
    document.body.append(root);

    // Fresh module state per test (resets the reloading/toastShown singletons).
    vi.resetModules();
    mod = await import("../../src/util/recover-stale-build");
  });

  afterEach(() => {
    root.remove();
    if (serviceWorkerDescriptor) {
      Object.defineProperty(
        navigator,
        "serviceWorker",
        serviceWorkerDescriptor
      );
    } else {
      Reflect.deleteProperty(navigator, "serviceWorker");
    }
    Reflect.deleteProperty(window, "externalApp");
    window.isDirtyState = false;
    globalThis.__DEV__ = false;
    globalThis.__DEMO__ = false;
  });

  describe("isStaleBuildError", () => {
    it.each([
      "/frontend_latest/core.abc12345.js",
      "https://ha.local/frontend_es5/panel-config.deadbeef99.js",
      "Failed to fetch dynamically imported module: /frontend_latest/x.abcdef12.js",
      "Importing a module script failed.",
      "error loading dynamically imported module",
      "ChunkLoadError: Loading chunk 5 failed",
    ])("detects a stale-build error: %s", (message) => {
      expect(mod.isStaleBuildError(message)).toBe(true);
    });

    it.each([
      undefined,
      "",
      "/frontend_latest/core.js", // dev, unhashed
      "/static/translations/en-abc12345.json", // hashed, but not an entry chunk
      "TypeError: x is not a function",
    ])("ignores non-stale input: %s", (message) => {
      expect(mod.isStaleBuildError(message)).toBe(false);
    });
  });

  describe("recoverFromStaleBuild", () => {
    it("does nothing in development", () => {
      globalThis.__DEV__ = true;

      expect(mod.recoverFromStaleBuild(STALE_URL, root)).toBe(false);
      expect(reloadMarker()).toBeNull();
      expect(notifications).toHaveLength(0);
    });

    it("does nothing in demo", () => {
      globalThis.__DEMO__ = true;

      expect(mod.recoverFromStaleBuild(STALE_URL, root)).toBe(false);
      expect(reloadMarker()).toBeNull();
    });

    it("ignores a non-stale error", () => {
      expect(mod.recoverFromStaleBuild("TypeError: boom", root)).toBe(false);
      expect(reloadMarker()).toBeNull();
      expect(notifications).toHaveLength(0);
    });

    it("reloads onto the current build when clean", () => {
      expect(mod.recoverFromStaleBuild(STALE_URL, root)).toBe(true);

      // reloadFresh() ran (marker written before navigating) and did not toast.
      expect(reloadMarker()).not.toBeNull();
      expect(notifications).toHaveLength(0);
    });

    it("uses the companion-app external command when a bridge is present", () => {
      const externalBus = vi.fn();
      (
        window as unknown as {
          externalApp: { externalBus: typeof externalBus };
        }
      ).externalApp = { externalBus };

      expect(mod.recoverFromStaleBuild(STALE_URL, root)).toBe(true);

      // Asks the native app to purge its cache and reload instead of the
      // browser-only path.
      expect(externalBus).toHaveBeenCalledOnce();
      expect(externalBus.mock.calls[0][0]).toContain(
        "frontend/reload_and_clear_cache"
      );
      expect(notifications).toHaveLength(0);
    });

    it("shows a reload toast instead of reloading when dirty", () => {
      window.isDirtyState = true;

      expect(mod.recoverFromStaleBuild(STALE_URL, root)).toBe(true);

      // Took the toast branch, not the reload branch.
      expect(reloadMarker()).toBeNull();
      expect(latestNotification()).toMatchObject({
        id: "frontend-update-available",
        message: {
          translationKey: "ui.notification_toast.new_version_available_reload",
        },
        action: {
          text: { translationKey: "ui.notification_toast.update_now" },
        },
        duration: -1,
        dismissable: false,
      });
    });

    it("does not reload again while the cooldown marker is set (loop guard)", async () => {
      expect(mod.recoverFromStaleBuild(STALE_URL, root)).toBe(true);
      const firstMarker = reloadMarker();
      expect(firstMarker).not.toBeNull();

      // Simulate the reloaded page: a fresh module (the in-memory reloading
      // flag is reset) but the sessionStorage cooldown marker persists.
      vi.resetModules();
      const reloaded: RecoverModule =
        await import("../../src/util/recover-stale-build");

      reloaded.recoverFromStaleBuild("/frontend_latest/app.def67890.js", root);

      // Guard blocked a second navigation: the marker is unchanged.
      expect(reloadMarker()).toBe(firstMarker);
    });
  });
});
