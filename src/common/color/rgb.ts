import { wcagLuminance, wcagContrast } from "culori";

/**
 * Calculates the luminosity of an RGB color.
 * @param rgb - The RGB color to calculate the luminosity of.
 * @returns The luminosity of the color.
 */
export const luminosity = (rgb: [number, number, number]): number =>
  wcagLuminance({
    mode: "rgb",
    r: rgb[0] / 255,
    g: rgb[1] / 255,
    b: rgb[2] / 255,
  });

/**
 * Calculates the contrast ratio between two RGB colors.
 * @param color1 - The first color to calculate the contrast ratio of.
 * @param color2 - The second color to calculate the contrast ratio of.
 * @returns The contrast ratio between the two colors.
 */
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

/**
 * Calculates the contrast ratio between two RGB colors.
 * @param rgb1 - The first color to calculate the contrast ratio of.
 * @param rgb2 - The second color to calculate the contrast ratio of.
 * @returns The contrast ratio between the two colors.
 */
export const getRGBContrastRatio = (
  rgb1: [number, number, number],
  rgb2: [number, number, number]
) => Math.round((rgbContrast(rgb1, rgb2) + Number.EPSILON) * 100) / 100;
