import { wcagLuminance, wcagContrast } from "culori";

export const luminosity = (rgb: [number, number, number]): number =>
  wcagLuminance({
    mode: "rgb",
    r: rgb[0] / 255,
    g: rgb[1] / 255,
    b: rgb[2] / 255,
  });

export const rgbContrast = (
  color1: [number, number, number],
  color2: [number, number, number]
) =>
  wcagContrast(
    {
      mode: "rgb",
      r: color1[0] / 255,
      g: color1[1] / 255,
      b: color1[2] / 255,
    },
    {
      mode: "rgb",
      r: color2[0] / 255,
      g: color2[1] / 255,
      b: color2[2] / 255,
    }
  );

export const getRGBContrastRatio = (
  rgb1: [number, number, number],
  rgb2: [number, number, number]
) => Math.round((rgbContrast(rgb1, rgb2) + Number.EPSILON) * 100) / 100;
