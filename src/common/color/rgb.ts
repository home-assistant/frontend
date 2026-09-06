import { parse, wcagLuminance, wcagContrast } from "culori";
import { theme2hex } from "./convert-color";

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

/**
 * Tells whether a color can be measured, which a CSS function that is passed
 * through unevaluated cannot, and whether it covers what is behind it
 * @param color - Color (HEX, rgb/rgba, named color) to check
 * @returns Whether a contrast against this color says anything
 */
export const isOpaqueColor = (color: string): boolean => {
  const parsed = parse(color.trim());
  return parsed !== undefined && (parsed.alpha ?? 1) === 1;
};

/**
 * Returns a contrasted color (black or white) for another color
 * @param color - Color (HEX, rgb/rgba, named color) to calculate a contrasted color
 * @returns HEX color, whichever of black and white has the higher contrast ratio
 */
export const getContrastedColorHex = (color: string): string => {
  const hex = theme2hex(color.trim());
  // culori throws on a color it cannot read
  if (!parse(hex)) {
    return "#ffffff";
  }
  return wcagContrast(hex, "#000000") >= wcagContrast(hex, "#ffffff")
    ? "#000000"
    : "#ffffff";
};
