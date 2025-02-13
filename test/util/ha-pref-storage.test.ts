import { describe, expect, afterEach, vi, test, beforeEach } from "vitest";
import type { HomeAssistant } from "../../src/types";
import { FallbackStorage } from "../test_helper/local-storage-fallback";

describe("ha-pref-storage", () => {
  const mockHass = {
    dockedSidebar: "auto",
    selectedTheme: { theme: "default" },
    vibrate: "false",
    unknownKey: "unknownValue",
  };

  beforeEach(() => {
    window.localStorage = new FallbackStorage();
  });

  afterEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  test("storeState", async () => {
    const { storeState } = await import("../../src/util/ha-pref-storage");

    window.localStorage.setItem = vi.fn();

    storeState(mockHass as unknown as HomeAssistant);
    expect(window.localStorage.setItem).toHaveBeenCalledTimes(7);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "dockedSidebar",
      JSON.stringify("auto")
    );
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "selectedLanguage",
      JSON.stringify(null)
    );
    expect(window.localStorage.setItem).not.toHaveBeenCalledWith(
      "unknownKey",
      JSON.stringify("unknownValue")
    );

    // browserThemeEnabled is not set in mockHass, so selectedTheme should not be stored
    expect(window.localStorage.setItem).not.toHaveBeenCalledWith(
      "selectedTheme",
      JSON.stringify({ theme: "default" })
    );
  });

  test("storeState fails", async () => {
    const { storeState } = await import("../../src/util/ha-pref-storage");

    window.localStorage.setItem = vi.fn((key) => {
      if (key === "selectedLanguage") {
        throw new Error("Test error");
      }
    });

    // eslint-disable-next-line no-global-assign
    console = {
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Console;

    storeState(mockHass as unknown as HomeAssistant);
    expect(window.localStorage.setItem).toHaveBeenCalledTimes(2);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "dockedSidebar",
      JSON.stringify("auto")
    );
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "selectedLanguage",
      JSON.stringify(null)
    );
    expect(window.localStorage.setItem).not.toHaveBeenCalledWith(
      "vibrate",
      JSON.stringify("false")
    );
    // eslint-disable-next-line no-console
    expect(console.warn).toHaveBeenCalledOnce();
    // eslint-disable-next-line no-console
    expect(console.warn).toHaveBeenCalledWith(
      "Cannot store state; Are you in private mode or is your storage full?"
    );
    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalledOnce();
  });

  test("getState", async () => {
    const { getState } = await import("../../src/util/ha-pref-storage");

    window.localStorage.setItem("selectedTheme", JSON.stringify("test"));
    window.localStorage.setItem("dockedSidebar", JSON.stringify(true));
    window.localStorage.setItem("selectedLanguage", JSON.stringify("de"));

    // should not be in state
    window.localStorage.setItem("testEntry", JSON.stringify("this is a test"));

    const state = getState();
    expect(state).toEqual({
      dockedSidebar: "docked",
      selectedTheme: { theme: "test" },
      browserThemeEnabled: true,
      selectedLanguage: "de",
    });
  });

  test("getState without theme", async () => {
    const { getState } = await import("../../src/util/ha-pref-storage");

    window.localStorage.setItem("dockedSidebar", JSON.stringify(true));
    window.localStorage.setItem("selectedLanguage", JSON.stringify("de"));

    const state = getState();
    expect(state).toEqual({
      dockedSidebar: "docked",
      selectedLanguage: "de",
    });
  });

  test("clearState", async () => {
    const { clearState } = await import("../../src/util/ha-pref-storage");

    window.localStorage.setItem("test", "test");

    expect(window.localStorage.length).toEqual(1);

    clearState();
    expect(window.localStorage.length).toEqual(0);
  });
});
