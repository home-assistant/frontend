import { describe, it, expect } from "vitest";
import {
  hex2rgb,
  rgb2hex,
  rgb2lab,
  lab2rgb,
  lab2hex,
  rgb2hsv,
  hsv2rgb,
  rgb2hs,
  hs2rgb,
  theme2hex,
} from "../../../src/common/color/convert-color";

describe("Color Conversion Tests", () => {
  it("should convert hex to rgb", () => {
    expect(hex2rgb("#ffffff")).toEqual([255, 255, 255]);
    expect(hex2rgb("#000000")).toEqual([0, 0, 0]);
  });

  it("should convert rgb to hex", () => {
    expect(rgb2hex([255, 255, 255])).toBe("#ffffff");
    expect(rgb2hex([0, 0, 0])).toBe("#000000");
  });

  it("should convert rgb to lab and back", () => {
    const rgb: [number, number, number] = [12, 206, 7];
    const lab = rgb2lab(rgb);
    expect(lab2rgb(lab)).toEqual(rgb);
  });

  it("should convert lab to hex", () => {
    const lab: [number, number, number] = [53.23288, 80.10933, 67.22006];
    expect(lab2hex(lab)).toBe("#ff0000");
  });

  it("should convert rgb to hsv and back", () => {
    const rgb: [number, number, number] = [255, 0, 0];
    const hsv = rgb2hsv(rgb);
    expect(hsv2rgb(hsv)).toEqual(rgb);
  });

  it("should convert rgb to hs and back", () => {
    const rgb: [number, number, number] = [255, 0, 0];
    const hs = rgb2hs(rgb);
    expect(hs2rgb(hs)).toEqual([255, 0, 0]);
  });

  it("should convert theme color to hex (ignoring alpha)", () => {
    expect(theme2hex("red")).toBe("#ff0000");
    expect(theme2hex("ReD")).toBe("#ff0000");
    expect(theme2hex("#ff0000")).toBe("#ff0000");
    expect(theme2hex("unicorn")).toBe("unicorn");
    expect(theme2hex("#abc")).toBe("#aabbcc");
    expect(theme2hex("#abcd")).toBe("#aabbcc");
    expect(theme2hex("#aabbccdd")).toBe("#aabbcc");
  });

  it("should convert rgb theme color to hex", () => {
    expect(theme2hex("rgb( 255, 0, 0)")).toBe("#ff0000");
    expect(theme2hex("rgb(0,255, 0)")).toBe("#00ff00");
    expect(theme2hex("rgb(0, 0,255 )")).toBe("#0000ff");
  });

  it("should convert rgba theme color to hex by ignoring alpha", () => {
    expect(theme2hex("rgba( 255, 0, 0, 0.5)")).toBe("#ff0000");
    expect(theme2hex("rgba(0,255, 0, 0.3)")).toBe("#00ff00");
    expect(theme2hex("rgba(0, 0,255 , 0.7)")).toBe("#0000ff");
  });
});
