import { afterEach, describe, it, expect, vi } from "vitest";
import {
  computeCssColor,
  cssColorToHex,
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

describe("cssColorToHex", () => {
  // jsdom has no canvas, so stand in for the browser's color normalization
  const normalized: Record<string, string> = {
    gold: "#ffd700",
    "#FFF": "#ffffff",
    "rgba(255, 0, 0, 0.5)": "rgba(255, 0, 0, 0.5)",
  };

  const mockCanvas = () => {
    let fillStyle = "#000000";
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      get fillStyle() {
        return fillStyle;
      },
      set fillStyle(value: string) {
        fillStyle = normalized[value] ?? fillStyle;
      },
    } as unknown as CanvasRenderingContext2D);
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("converts a CSS color name to hex", () => {
    mockCanvas();
    expect(cssColorToHex("gold")).toBe("#ffd700");
  });

  it("expands a short hex color", () => {
    mockCanvas();
    expect(cssColorToHex("#FFF")).toBe("#ffffff");
  });

  it("rejects invalid colors and theme color names", () => {
    mockCanvas();
    expect(cssColorToHex("not-a-color")).toBeUndefined();
    expect(cssColorToHex("primary")).toBeUndefined();
  });

  it("rejects colors with transparency", () => {
    mockCanvas();
    expect(cssColorToHex("rgba(255, 0, 0, 0.5)")).toBeUndefined();
  });
});
