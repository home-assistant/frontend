import { describe, expect, afterEach, vi, test } from "vitest";
import {
  clearState,
  getState,
  storeState,
} from "../../src/util/ha-pref-storage";
import type { HomeAssistant } from "../../src/types";

describe("ha-pref-storage", () => {
  const mockHass = {
    dockedSidebar: "auto",
    selectedTheme: { theme: "default" },
    unknownKey: "unknownValue",
  };

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("storeState", () => {
    window.localStorage = {
      setItem: vi.fn(),
    } as unknown as Storage;

    storeState(mockHass as unknown as HomeAssistant);
    expect(window.localStorage.setItem).toHaveBeenCalledTimes(8);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "dockedSidebar",
      JSON.stringify("auto")
    );
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "selectedTheme",
      JSON.stringify({ theme: "default" })
    );
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "selectedLanguage",
      JSON.stringify(null)
    );
    expect(window.localStorage.setItem).not.toHaveBeenCalledWith(
      "unknownKey",
      JSON.stringify("unknownValue")
    );
  });

  test("storeState fails", () => {
    window.localStorage = {
      setItem: vi.fn((key) => {
        if (key === "selectedTheme") {
          throw new Error("Test error");
        }
      }),
    } as unknown as Storage;

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
      "selectedTheme",
      JSON.stringify({ theme: "default" })
    );
    expect(window.localStorage.setItem).not.toHaveBeenCalledWith(
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

  test("getState", () => {
    window.localStorage = {
      getItem: vi.fn((key) => {
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
      }),
    } as unknown as Storage;

    const state = getState();
    expect(state).toEqual({
      dockedSidebar: "docked",
      selectedTheme: { theme: "test" },
      selectedLanguage: "german",
    });
  });

  test("clearState", () => {
    window.localStorage = {
      clear: vi.fn(),
    } as unknown as Storage;

    clearState();
    expect(window.localStorage.clear).toHaveBeenCalled();
  });
});
