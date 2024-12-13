import { describe, test, expect } from "vitest";
import {
  getColorByIndex,
  getGraphColorByIndex,
  COLORS,
} from "../../../src/common/color/colors";
import { theme2hex } from "../../../src/common/color/convert-color";

describe("getColorByIndex", () => {
  test("return the correct color for a given index", () => {
    expect(getColorByIndex(0)).toBe(COLORS[0]);
    expect(getColorByIndex(10)).toBe(COLORS[10]);
  });

  test("wrap around if the index is greater than the length of COLORS", () => {
    expect(getColorByIndex(COLORS.length)).toBe(COLORS[0]);
    expect(getColorByIndex(COLORS.length + 4)).toBe(COLORS[4]);
  });
});

describe("getGraphColorByIndex", () => {
  test("return the correct theme color if it exists", () => {
    const style = {
      getPropertyValue: (prop) => (prop === "--graph-color-1" ? "#123456" : ""),
    } as CSSStyleDeclaration;
    expect(getGraphColorByIndex(0, style)).toBe(theme2hex("#123456"));
  });

  test("return the default color if the theme color does not exist", () => {
    const style = {
      getPropertyValue: () => "",
    } as unknown as CSSStyleDeclaration;
    expect(getGraphColorByIndex(0, style)).toBe(theme2hex(COLORS[0]));
  });
});
