import { describe, it, expect } from "vitest";
import {
  temperature2rgb,
  mired2kelvin,
  kelvin2mired,
  rgbww2rgb,
  rgbw2rgb,
} from "../../../src/common/color/convert-light-color";

describe("temperature2rgb", () => {
  it("should convert temperature to RGB", () => {
    expect(temperature2rgb(6600)).toEqual([255, 255, 255]);
    expect(temperature2rgb(6601)).toEqual([255, 252, 255]);
    expect(temperature2rgb(1900)).toEqual([255, 132, 0]);
  });
});

describe("mired2kelvin", () => {
  it("should convert mired to kelvin", () => {
    expect(mired2kelvin(20)).toBe(50000);
    expect(mired2kelvin(0)).toBe(1000000);
  });
});

describe("kelvin2mired", () => {
  it("should convert kelvin to mired", () => {
    expect(kelvin2mired(6500)).toBe(153);
    expect(kelvin2mired(2700)).toBe(370);
    expect(kelvin2mired(0)).toBe(1000000);
  });
});

describe("rgbww2rgb", () => {
  it("should convert RGBWW to RGB", () => {
    expect(rgbww2rgb([255, 0, 0, 255, 0])).toEqual([255, 128, 126]);
    expect(rgbww2rgb([0, 255, 0, 0, 255])).toEqual([154, 255, 53]);
    expect(rgbww2rgb([255, 0, 0, 255, 128], 1000)).toEqual([255, 75, 25]);
    expect(rgbww2rgb([255, 0, 0, 255, 128], undefined, 5000)).toEqual([
      255, 102, 81,
    ]);
    expect(rgbww2rgb([255, 0, 0, 255, 128], 3000, 4000)).toEqual([255, 98, 73]);
  });
});

describe("rgbw2rgb", () => {
  it("should convert RGBW to RGB", () => {
    expect(rgbw2rgb([255, 0, 0, 255])).toEqual([255, 128, 128]);
    expect(rgbw2rgb([0, 255, 0, 0])).toEqual([0, 255, 0]);
  });
});
