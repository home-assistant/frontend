import { describe, it, expect } from "vitest";
import {
  computeCssColor,
  THEME_COLORS,
} from "../../../src/common/color/compute-color";

describe("computeCssColor", () => {
  it("should return CSS variable for theme colors", () => {
    THEME_COLORS.forEach((color) => {
      expect(computeCssColor(color)).toBe(`var(--${color}-color)`);
    });
  });

  it("should return the input color if it is not a theme color", () => {
    const nonThemeColor = "non-theme-color";
    expect(computeCssColor(nonThemeColor)).toBe(nonThemeColor);
  });
});
