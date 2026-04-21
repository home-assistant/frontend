import { describe, expect, it } from "vitest";

describe("hui-root background placement", () => {
  it(
    "keeps the view background inside the themed view container",
    async () => {
      globalThis.__DEV__ = false;
      globalThis.__DEMO__ = false;
      globalThis.__HASS_URL__ = "";
      globalThis.__STATIC_PATH__ = "/";
      globalThis.window = document.defaultView as any;
      globalThis.navigator = document.defaultView!.navigator as any;
      globalThis.scrollTo = () => undefined;

      await import("../../../src/panels/lovelace/hui-root");

      const root = document.createElement("hui-root") as any;

      root.hass = {
        localize: (key: string) => key,
        user: { id: "user", is_admin: false },
        kioskMode: false,
        enableShortcuts: false,
        config: { components: [] },
        themes: { themes: { test: { "lovelace-background": "#123456" } } },
        selectedTheme: null,
        hassUrl: (url: string) => url,
        callService: () => undefined,
        callWS: async () => ({ resource_mode: "storage" }),
        loadFragmentTranslation: async () => undefined,
      };

      root.lovelace = {
        config: { views: [{ title: "Test view", theme: "test" }] },
        rawConfig: { views: [{ title: "Test view", theme: "test" }] },
        mode: "storage",
        editMode: false,
        setEditMode: () => undefined,
        saveConfig: async () => undefined,
        enableFullEditMode: () => undefined,
      };

      root.route = { path: "/0", prefix: "/lovelace/test" };
      root.narrow = false;

      await root.performUpdate();

      const background = root.shadowRoot!.querySelector("hui-view-background");
      const container = root.shadowRoot!.querySelector("hui-view-container");

      expect(background).toBeTruthy();
      expect(container).toBeTruthy();
      expect(background!.parentElement).toBe(container);
    },
    20000
  );
});
