import { describe, expect, afterEach, vi, test } from "vitest";
import type { HomeAssistant } from "../../src/types";

describe("ha-pref-storage", () => {
  const mockHass = {
    dockedSidebar: "auto",
    selectedTheme: { theme: "default" },
    unknownKey: "unknownValue",
  };

  afterEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  test.only("storeState", async () => {
    const { storeState } = await import("../../src/util/ha-pref-storage");

    const { FallbackStorage: fallbackStorage } = await import(
      "../test_helper/local-storage-fallback"
    );
    const setItemSpy = vi.fn();
    fallbackStorage.prototype.setItem = setItemSpy;

    storeState(mockHass as unknown as HomeAssistant);
    expect(setItemSpy).toHaveBeenCalledTimes(8);
    expect(setItemSpy).toHaveBeenCalledWith(
      "dockedSidebar",
      JSON.stringify("auto")
    );
    expect(setItemSpy).toHaveBeenCalledWith(
      "selectedTheme",
      JSON.stringify({ theme: "default" })
    );
    expect(setItemSpy).toHaveBeenCalledWith(
      "selectedLanguage",
      JSON.stringify(null)
    );
    expect(setItemSpy).not.toHaveBeenCalledWith(
      "unknownKey",
      JSON.stringify("unknownValue")
    );
  });

  test("storeState fails", async () => {
    const { storeState } = await import("../../src/util/ha-pref-storage");
    const { FallbackStorage: fallbackStorage } = await import(
      "../test_helper/local-storage-fallback"
    );
    const setItemSpy = vi.fn((key) => {
      if (key === "selectedTheme") {
        throw new Error("Test error");
      }
    });
    fallbackStorage.prototype.setItem = setItemSpy;

    // eslint-disable-next-line no-global-assign
    console = {
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Console;

    storeState(mockHass as unknown as HomeAssistant);
    expect(setItemSpy).toHaveBeenCalledTimes(2);
    expect(setItemSpy).toHaveBeenCalledWith(
      "dockedSidebar",
      JSON.stringify("auto")
    );
    expect(setItemSpy).toHaveBeenCalledWith(
      "selectedTheme",
      JSON.stringify({ theme: "default" })
    );
    expect(setItemSpy).not.toHaveBeenCalledWith(
      "selectedLanguage",
      JSON.stringify(null)
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
    const { FallbackStorage: fallbackStorage } = await import(
      "../test_helper/local-storage-fallback"
    );
    const getItemSpy = vi.fn((key) => {
      if (key === "selectedTheme") {
        return JSON.stringify("test");
      }
      if (key === "dockedSidebar") {
        return JSON.stringify(true);
      }
      if (key === "selectedLanguage") {
        return JSON.stringify("german");
      }
      return null;
    });
    fallbackStorage.prototype.getItem = getItemSpy;

    const state = getState();
    expect(state).toEqual({
      dockedSidebar: "docked",
      selectedTheme: { theme: "test" },
      selectedLanguage: "german",
    });
  });

  test("clearState", async () => {
    const { clearState } = await import("../../src/util/ha-pref-storage");
    const { FallbackStorage: fallbackStorage } = await import(
      "../test_helper/local-storage-fallback"
    );
    const clearSpy = vi.fn();
    fallbackStorage.prototype.clear = clearSpy;

    clearState();
    expect(clearSpy).toHaveBeenCalled();
  });
});
