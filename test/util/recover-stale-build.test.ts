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
  let cachesDescriptor: PropertyDescriptor | undefined;
  let fetchMock: ReturnType<typeof vi.fn>;

  const httpResponse = (status: number) => ({
    status,
    ok: status >= 200 && status < 300,
  });

  const latestNotification = () => notifications[notifications.length - 1];
  const reloadMarker = () => sessionStorage.getItem(RELOAD_KEY);

  beforeEach(async () => {
    globalThis.__DEV__ = false;
    globalThis.__DEMO__ = false;
    window.isDirtyState = false;
    sessionStorage.clear();

    // No controlling service worker → reloadFresh() takes the synchronous
    // path straight to the (jsdom no-op) navigate.
    serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "serviceWorker"
    );
    cachesDescriptor = Object.getOwnPropertyDescriptor(window, "caches");
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: null },
    });

    // The staleness probe; by default the chunk really is gone.
    fetchMock = vi.fn().mockResolvedValue(httpResponse(404));
    vi.stubGlobal("fetch", fetchMock);

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
    vi.unstubAllGlobals();
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
    if (cachesDescriptor) {
      Object.defineProperty(window, "caches", cachesDescriptor);
    } else {
      Reflect.deleteProperty(window, "caches");
    }
    Reflect.deleteProperty(window, "externalApp");
    Reflect.deleteProperty(window, "webkit");
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
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("reloads onto the current build when the chunk is gone", async () => {
      await expect(mod.recoverFromStaleBuild(STALE_URL, root)).resolves.toBe(
        true
      );

      // Asked the server about the chunk, bypassing every cache…
      expect(fetchMock).toHaveBeenCalledWith(
        STALE_URL,
        expect.objectContaining({ method: "HEAD", cache: "no-store" })
      );
      // …then reloadFresh() ran (marker written before navigating), no toast.
      expect(reloadMarker()).not.toBeNull();
      expect(notifications).toHaveLength(0);
    });

    it("drops the service worker and caches before reloading", async () => {
      const unregister = vi.fn().mockResolvedValue(true);
      Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: {
          controller: {},
          getRegistrations: vi.fn().mockResolvedValue([{ unregister }]),
        },
      });
      const cacheDelete = vi.fn().mockResolvedValue(true);
      Object.defineProperty(window, "caches", {
        configurable: true,
        value: {
          keys: vi.fn().mockResolvedValue(["a", "b"]),
          delete: cacheDelete,
        },
      });

      await expect(mod.recoverFromStaleBuild(STALE_URL, root)).resolves.toBe(
        true
      );

      await vi.waitFor(() => expect(unregister).toHaveBeenCalledOnce());
      expect(cacheDelete).toHaveBeenCalledTimes(2);
    });

    it("uses the companion-app command when the WebKit bridge is present", async () => {
      const postMessage = vi.fn();
      (
        window as unknown as {
          webkit: {
            messageHandlers: {
              externalBus: { postMessage: typeof postMessage };
            };
          };
        }
      ).webkit = { messageHandlers: { externalBus: { postMessage } } };

      await expect(mod.recoverFromStaleBuild(STALE_URL, root)).resolves.toBe(
        true
      );

      // Asks the native app to purge its cache and reload instead of the
      // browser path.
      expect(postMessage).toHaveBeenCalledOnce();
      expect(postMessage.mock.calls[0][0]).toMatchObject({
        type: "frontend/reload_and_clear_cache",
      });
      expect(notifications).toHaveLength(0);
    });

    it("defers with a toast instead of reloading when dirty", async () => {
      window.isDirtyState = true;

      await expect(mod.recoverFromStaleBuild(STALE_URL, root)).resolves.toBe(
        true
      );

      // Took the toast branch, not the reload branch, and the toast has no
      // immediate-reload action that could discard unsaved work.
      expect(reloadMarker()).toBeNull();
      expect(latestNotification()).toMatchObject({
        id: "frontend-update-available",
        message: {
          translationKey: "ui.notification_toast.new_version_available_reload",
        },
        duration: -1,
        dismissable: false,
      });
      expect(latestNotification().action).toBeUndefined();
    });

    describe("staleness probe", () => {
      const IMPORT_FAILURE =
        "error loading dynamically imported module: " +
        "http://192.168.1.134:8123/frontend_latest/23792.c1214a5d0ae33023.js";

      it("does not reload when the chunk is still on the server", async () => {
        fetchMock.mockResolvedValue(httpResponse(200));

        // Dropping the caches cannot fix a transport failure.
        await expect(mod.recoverFromStaleBuild(STALE_URL, root)).resolves.toBe(
          false
        );
        expect(reloadMarker()).toBeNull();
        expect(notifications).toHaveLength(0);
      });

      it("does not reload when the server is unreachable", async () => {
        fetchMock.mockRejectedValue(
          new TypeError("NetworkError when attempting to fetch resource.")
        );

        await expect(
          mod.recoverFromStaleBuild(IMPORT_FAILURE, root)
        ).resolves.toBe(false);
        expect(reloadMarker()).toBeNull();
      });

      it("does not reload on a server error other than 404/410", async () => {
        fetchMock.mockResolvedValue(httpResponse(502));

        await expect(mod.recoverFromStaleBuild(STALE_URL, root)).resolves.toBe(
          false
        );
        expect(reloadMarker()).toBeNull();
      });

      it("probes the URL taken from the import failure message", async () => {
        await expect(
          mod.recoverFromStaleBuild(IMPORT_FAILURE, root)
        ).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledWith(
          "http://192.168.1.134:8123/frontend_latest/23792.c1214a5d0ae33023.js",
          expect.objectContaining({ method: "HEAD" })
        );
      });

      it("probes once for a burst of failures", async () => {
        fetchMock.mockResolvedValue(httpResponse(200));

        const verdicts = await Promise.all(
          Array.from({ length: 5 }, (_, i) =>
            mod.recoverFromStaleBuild(`/frontend_latest/${i}.abc12345.js`, root)
          )
        );

        expect(verdicts).toEqual([false, false, false, false, false]);
        expect(fetchMock).toHaveBeenCalledOnce();
      });

      it("suppresses further probes after finding the build intact", async () => {
        fetchMock.mockResolvedValue(httpResponse(200));
        await expect(mod.recoverFromStaleBuild(STALE_URL, root)).resolves.toBe(
          false
        );

        // Answered synchronously from the previous verdict: no second probe.
        expect(mod.recoverFromStaleBuild(STALE_URL, root)).toBe(false);
        expect(fetchMock).toHaveBeenCalledOnce();
      });

      it("retries with GET when the server refuses HEAD", async () => {
        fetchMock
          .mockResolvedValueOnce(httpResponse(405))
          .mockResolvedValueOnce(httpResponse(404));

        await expect(mod.recoverFromStaleBuild(STALE_URL, root)).resolves.toBe(
          true
        );

        expect(fetchMock).toHaveBeenCalledTimes(2);
        // Cache-busted so neither the HTTP cache nor the precache route answers.
        expect(fetchMock.mock.calls[1][0]).toContain("ha_probe=");
        expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "GET" });
        expect(reloadMarker()).not.toBeNull();
      });

      it.each([
        // index.html imports extra modules without a catch, so a broken one
        // rejects into the recovery on every page load.
        "Failed to fetch dynamically imported module: /local/layout-card.js",
        "error loading dynamically imported module: " +
          "http://192.168.1.134:8123/hacsfiles/silam_pollen/forecast-card.js",
        // A resource URL with literal brackets from a broken configuration.
        "error loading dynamically imported module: " +
          "http://192.168.1.134:8123/[/hacsfiles/card-mod/card-mod.js?hacstag=1]",
      ])(
        "ignores a failure of a file this build does not ship: %s",
        (message) => {
          expect(mod.recoverFromStaleBuild(message, root)).toBe(false);
          expect(fetchMock).not.toHaveBeenCalled();
          expect(reloadMarker()).toBeNull();
        }
      );

      it("probes the running build when the message names no file", async () => {
        // Safari's message names nothing, so a hashed file of this build
        // stands in for the question.
        performance.clearResourceTimings?.();
        vi.spyOn(performance, "getEntriesByType").mockReturnValue([
          { name: "https://ha.local/static/translations/en-abc12345.json" },
          { name: "https://ha.local/frontend_latest/app.abc12345.js" },
        ] as unknown as PerformanceEntryList);

        await expect(
          mod.recoverFromStaleBuild("Importing a module script failed.", root)
        ).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://ha.local/frontend_latest/app.abc12345.js",
          expect.objectContaining({ method: "HEAD" })
        );
        expect(reloadMarker()).not.toBeNull();
      });

      it("does nothing when there is no evidence to go on", async () => {
        vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);

        expect(
          mod.recoverFromStaleBuild("Importing a module script failed.", root)
        ).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(reloadMarker()).toBeNull();
      });
    });

    it("does not reload again while the cooldown marker is set (loop guard)", async () => {
      await expect(mod.recoverFromStaleBuild(STALE_URL, root)).resolves.toBe(
        true
      );
      const firstMarker = reloadMarker();
      expect(firstMarker).not.toBeNull();

      // Simulate the reloaded page: a fresh module (the in-memory reloading
      // flag is reset) but the sessionStorage cooldown marker persists.
      vi.resetModules();
      const reloaded: RecoverModule =
        await import("../../src/util/recover-stale-build");

      // Blocked by the cooldown → returns false so the caller still surfaces it.
      await expect(
        reloaded.recoverFromStaleBuild("/frontend_latest/app.def67890.js", root)
      ).resolves.toBe(false);
      expect(reloadMarker()).toBe(firstMarker);
    });
  });
});
