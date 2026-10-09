import { describe, it, expect } from "vitest";
import {
  cssColorToHex,
  expandHex,
  hexBlend,
} from "../../../src/common/color/hex";

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

describe("cssColorToHex", () => {
  it("converts a CSS color name to hex", () => {
    expect(cssColorToHex("Gold")).toBe("#ffd700");
  });

  it("converts other opaque CSS colors to hex", () => {
    expect(cssColorToHex("#FFF")).toBe("#ffffff");
    expect(cssColorToHex("rgb(10, 20, 30)")).toBe("#0a141e");
    expect(cssColorToHex("hsl(120 100% 50%)")).toBe("#00ff00");
  });

  it("rejects invalid colors, theme color names and CSS-wide values", () => {
    expect(cssColorToHex("not-a-color")).toBeUndefined();
    expect(cssColorToHex("primary")).toBeUndefined();
    expect(cssColorToHex("inherit")).toBeUndefined();
  });

  it("rejects colors with transparency", () => {
    expect(cssColorToHex("rgba(255, 0, 0, 0.5)")).toBeUndefined();
    expect(cssColorToHex("transparent")).toBeUndefined();
  });
});
