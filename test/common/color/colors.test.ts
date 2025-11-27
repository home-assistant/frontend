import { describe, test, expect } from "vitest";
import {
  getColorByIndex,
  getGraphColorByIndex,
  COLORS_COUNT,
} from "../../../src/common/color/colors";
import { theme2hex } from "../../../src/common/color/convert-color";

describe("getColorByIndex", () => {
  test("return the correct color from CSS variable", () => {
    const style = {
      getPropertyValue: (prop) => {
        if (prop === "--color-1") return "#4269d0";
        if (prop === "--color-11") return "#c99000";
        return "";
      },
    } as CSSStyleDeclaration;
    expect(getColorByIndex(0, style)).toBe(theme2hex("#4269d0"));
    expect(getColorByIndex(10, style)).toBe(theme2hex("#c99000"));
  });

  test("wrap around if the index is greater than the total count", () => {
    const style = {
      getPropertyValue: (prop) => {
        if (prop === "--color-1") return "#4269d0";
        if (prop === "--color-5") return "#a463f2";
        return "";
      },
    } as CSSStyleDeclaration;
    // Index 54 should wrap to color 1
    expect(getColorByIndex(COLORS_COUNT, style)).toBe(theme2hex("#4269d0"));
    // Index 58 should wrap to color 5
    expect(getColorByIndex(COLORS_COUNT + 4, style)).toBe(theme2hex("#a463f2"));
  });
});

describe("getGraphColorByIndex", () => {
  test("return color from --graph-color variable when it exists", () => {
    const style = {
      getPropertyValue: (prop) => (prop === "--graph-color-1" ? "#123456" : ""),
    } as CSSStyleDeclaration;
    expect(getGraphColorByIndex(0, style)).toBe(theme2hex("#123456"));
  });

  test("fallback to --color variable when --graph-color does not exist", () => {
    const style = {
      getPropertyValue: (prop) => (prop === "--color-5" ? "#abcdef" : ""),
    } as CSSStyleDeclaration;
    // Index 4 should try --graph-color-5, then fallback to --color-5
    expect(getGraphColorByIndex(4, style)).toBe(theme2hex("#abcdef"));
  });

  test("prefer --graph-color over --color when both exist", () => {
    const style = {
      getPropertyValue: (prop) => {
        if (prop === "--graph-color-1") return "#111111";
        if (prop === "--color-1") return "#222222";
        return "";
      },
    } as CSSStyleDeclaration;
    // Should prefer --graph-color-1
    expect(getGraphColorByIndex(0, style)).toBe(theme2hex("#111111"));
  });
});
