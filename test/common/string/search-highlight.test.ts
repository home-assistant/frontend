import { describe, expect, it } from "vitest";
import {
  getHighlightRanges,
  renderHighlightedText,
} from "../../../src/common/string/search-highlight";

describe("search highlight", () => {
  it("returns substring ranges", () => {
    expect(getHighlightRanges("Hello World", "lo")).toEqual([
      { start: 3, end: 5 },
    ]);
  });

  it("matches diacritics-insensitive", () => {
    expect(getHighlightRanges("Café", "cafe")).toEqual([{ start: 0, end: 4 }]);
  });

  it("returns ranges for multiple terms", () => {
    expect(getHighlightRanges("alpha beta gamma", "alpha gamma")).toEqual([
      { start: 0, end: 5 },
      { start: 11, end: 16 },
    ]);
  });

  it("renders highlighted text parts", () => {
    const result = renderHighlightedText("Hello", "ell");
    expect(Array.isArray(result)).toBe(true);
    const parts = result as unknown as unknown[];
    expect(parts[0]).toBe("H");
    expect(parts[2]).toBe("o");
  });

  it("returns original text when query is empty", () => {
    expect(renderHighlightedText("Hello", "")).toBe("Hello");
  });
});
