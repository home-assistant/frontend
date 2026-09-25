import { describe, it, expect } from "vitest";
import {
  luminosity,
  rgbContrast,
  getRGBContrastRatio,
  getContrastedColorHex,
} from "../../../src/common/color/rgb";

describe("luminosity", () => {
  it("calculates the correct luminosity for black", () => {
    expect(luminosity([0, 0, 0])).toBe(0);
  });

  it("calculates the correct luminosity for white", () => {
    expect(luminosity([255, 255, 255])).toBe(1);
  });

  it("calculates the correct luminosity for red", () => {
    expect(luminosity([255, 0, 0])).toBe(0.2126);
  });
});

describe("rgbContrast", () => {
  it("calculates the correct contrast ratio between black and white", () => {
    expect(rgbContrast([0, 0, 0], [255, 255, 255])).toBe(21);
    expect(rgbContrast([255, 255, 255], [0, 0, 0])).toBe(21);
  });

  it("calculates the correct contrast ratio between red and white", () => {
    expect(rgbContrast([255, 0, 0], [255, 255, 255])).toBeCloseTo(4);
  });
});

describe("getRGBContrastRatio", () => {
  it("calculates the correct rounded contrast ratio between black and white", () => {
    expect(getRGBContrastRatio([0, 0, 0], [255, 255, 255])).toBe(21);
  });

  it("calculates the correct rounded contrast ratio between red and white", () => {
    expect(getRGBContrastRatio([255, 0, 0], [255, 255, 255])).toBe(4);
  });
});

describe("getContrastedColorHex", () => {
  it("picks white on dark backgrounds and black on light ones", () => {
    expect(getContrastedColorHex("#000000")).toBe("#ffffff");
    expect(getContrastedColorHex("#ffffff")).toBe("#000000");
  });

  it("picks whichever of black and white contrasts better", () => {
    // --color-3 and --color-8 of the default palette
    expect(getContrastedColorHex("#ff725c")).toBe("#000000");
    expect(getContrastedColorHex("#97bbf5")).toBe("#000000");
    expect(getContrastedColorHex("#4269d0")).toBe("#ffffff");
  });

  it("switches sides where the two contrast ratios meet", () => {
    expect(getContrastedColorHex("#757575")).toBe("#ffffff");
    expect(getContrastedColorHex("#767676")).toBe("#000000");
  });

  it("falls back on a color it cannot read", () => {
    expect(getContrastedColorHex("")).toBe("#ffffff");
    expect(getContrastedColorHex("color-mix(in srgb, red, blue)")).toBe(
      "#ffffff"
    );
  });

  it("reads a color with surrounding whitespace", () => {
    expect(getContrastedColorHex("  #ffe066 ")).toBe("#000000");
  });
});
