import { describe, it, expect } from "vitest";
import { expandHex, hexBlend } from "../../../src/common/color/hex";

describe("expandHex", () => {
  it("should expand a 3-digit hex code to 6 digits", () => {
    expect(expandHex("#abc")).toBe("aabbcc");
  });

  it("should return a 6-digit hex code unchanged", () => {
    expect(expandHex("#abcdef")).toBe("abcdef");
  });
});

describe("hexBlend", () => {
  it("should blend two hex colors with default blend value", () => {
    expect(hexBlend("#000000", "#ffffff")).toBe("#7f7f7f");
  });

  it("should blend two hex colors with a specified blend value", () => {
    expect(hexBlend("#ff0000", "#0000ff", 25)).toBe("#3f00bf");
  });

  it("should return the first color if blend is 100", () => {
    expect(hexBlend("#ff0000", "#0000ff", 100)).toBe("#ff0000");
  });

  it("should return the second color if blend is 0", () => {
    expect(hexBlend("#ff0000", "#0000ff", 0)).toBe("#0000ff");
  });
});
