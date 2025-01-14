import { describe, it, expect } from "vitest";
import {
  luminosity,
  rgbContrast,
  getRGBContrastRatio,
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
