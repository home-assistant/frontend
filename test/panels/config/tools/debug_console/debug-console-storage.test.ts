import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MAX_HISTORY,
  addToHistory,
  loadHistory,
  loadPasteAllowed,
  savePasteAllowed,
} from "../../../../../src/panels/config/tools/debug_console/debug-console-storage";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("debug console history", () => {
  it("keeps the history per user", () => {
    addToHistory("alice", [], "print('alice')");

    expect(loadHistory("alice")).toEqual(["print('alice')"]);
    expect(loadHistory("bob")).toEqual([]);
  });

  it("does not add code that ran right before again", () => {
    const history = addToHistory("alice", ["1 + 1"], "1 + 1");

    expect(history).toEqual(["1 + 1"]);
  });

  it("keeps only the newest entries", () => {
    const full = Array.from({ length: MAX_HISTORY }, (_, index) => `${index}`);

    const history = addToHistory("alice", full, "newest");

    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0]).toBe("1");
    expect(history[MAX_HISTORY - 1]).toBe("newest");
  });

  it("starts empty when the stored history is broken", () => {
    window.localStorage.setItem("tools-debug-console-history-alice", "{nope");

    expect(loadHistory("alice")).toEqual([]);
  });

  it("works without storage, for this page load", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage is full");
    });

    expect(addToHistory("alice", [], "1 + 1")).toEqual(["1 + 1"]);
  });
});

describe("debug console paste guard", () => {
  it("remembers unlocking pasting per user", () => {
    savePasteAllowed("alice");

    expect(loadPasteAllowed("alice")).toBe(true);
    expect(loadPasteAllowed("bob")).toBe(false);
  });

  it("keeps pasting blocked without storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage is blocked");
    });

    expect(loadPasteAllowed("alice")).toBe(false);
  });
});
