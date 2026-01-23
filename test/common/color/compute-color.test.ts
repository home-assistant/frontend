import { describe, it, expect } from "vitest";
import { computeCssColor } from "../../../src/common/color/compute-color";
import {
  DEFAULT_THEME_COLORS
} from "../../../src/resources/theme/color/color.globals";

describe("computeCssColor", () => {
  it("should return CSS variable for theme colors", () => {
    Object.keys(DEFAULT_THEME_COLORS).forEach((color) => {
      expect(computeCssColor(color)).toBe(`var(--${color}-color)`);
    });
  });

  it("should return the input color if it is not a theme color", () => {
    const nonThemeColor = "non-theme-color";
    expect(computeCssColor(nonThemeColor)).toBe(nonThemeColor);
  });
});
