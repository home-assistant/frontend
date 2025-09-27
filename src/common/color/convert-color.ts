import {
  convertHsvToRgb,
  convertLabToRgb,
  convertRgbToHsv,
  convertRgbToLab,
  formatHex,
  parse,
} from "culori";

/**
 * Converts a hex color string to an RGB array.
 * @param hex - The hex color string to convert.
 * @returns The RGB array.
 * @throws If the hex color is invalid.
 */
export const hex2rgb = (hex: string): [number, number, number] => {
  const color = parse(hex);
  if (!color || color.mode !== "rgb") {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [
    Math.round(color.r * 255),
    Math.round(color.g * 255),
    Math.round(color.b * 255),
  ];
};

/**
 * Converts an RGB array to a hex color string.
 * @param rgb - The RGB array to convert.
 * @returns The hex color string.
 * @throws If the RGB array is invalid.
 */
export const rgb2hex = (rgb: [number, number, number]): string => {
  const hex = formatHex({
    mode: "rgb",
    r: rgb[0] / 255,
    g: rgb[1] / 255,
    b: rgb[2] / 255,
  });
  return hex || "#000000";
};

/**
 * Converts an RGB array to a LAB array.
 * @param rgb - The RGB array to convert.
 * @returns The LAB array.
 * @throws If the RGB array is invalid.
 */
export const rgb2lab = (
  rgb: [number, number, number]
): [number, number, number] => {
  const labColor = convertRgbToLab({
    r: rgb[0] / 255,
    g: rgb[1] / 255,
    b: rgb[2] / 255,
  });
  return [labColor.l, labColor.a, labColor.b];
};

/**
 * Converts a LAB array to an RGB array.
 * @param lab - The LAB array to convert.
 * @returns The RGB array.
 * @throws If the LAB array is invalid.
 */
export const lab2rgb = (
  lab: [number, number, number]
): [number, number, number] => {
  const rgbColor = convertLabToRgb({
    l: lab[0],
    a: lab[1],
    b: lab[2],
  });
  return [
    Math.round(Math.max(0, Math.min(255, (rgbColor.r ?? 0) * 255))),
    Math.round(Math.max(0, Math.min(255, (rgbColor.g ?? 0) * 255))),
    Math.round(Math.max(0, Math.min(255, (rgbColor.b ?? 0) * 255))),
  ];
};

/**
 * Converts a LAB array to a hex color string.
 * @param lab - The LAB array to convert.
 * @returns The hex color string.
 * @throws If the LAB array is invalid.
 */
export const lab2hex = (lab: [number, number, number]): string => {
  const rgb = lab2rgb(lab);
  return rgb2hex(rgb);
};

/**
 * Converts an RGB array to an HSV array.
 * @param rgb - The RGB array to convert.
 * @returns The HSV array.
 * @throws If the RGB array is invalid.
 */
export const rgb2hsv = (
  rgb: [number, number, number]
): [number, number, number] => {
  const hsvColor = convertRgbToHsv({
    r: rgb[0] / 255,
    g: rgb[1] / 255,
    b: rgb[2] / 255,
  });
  return [hsvColor.h ?? 0, hsvColor.s, hsvColor.v];
};

/**
 * Converts an HSV array to an RGB array.
 * @param hsvColor - The HSV array to convert.
 * @returns The RGB array.
 * @throws If the HSV array is invalid.
 */
export const hsv2rgb = (
  hsvColor: [number, number, number]
): [number, number, number] => {
  const rgbColor = convertHsvToRgb({
    h: hsvColor[0],
    s: hsvColor[1],
    v: hsvColor[2],
  });
  return [
    Math.round((rgbColor.r ?? 0) * 255),
    Math.round((rgbColor.g ?? 0) * 255),
    Math.round((rgbColor.b ?? 0) * 255),
  ];
};

/**
 * Converts an RGB array to an HS array.
 * @param rgb - The RGB array to convert.
 * @returns The HS array.
 * @throws If the RGB array is invalid.
 */
export const rgb2hs = (rgb: [number, number, number]): [number, number] =>
  rgb2hsv(rgb).slice(0, 2) as [number, number];

/**
 * Converts an HS array to an RGB array.
 * @param hs - The HS array to convert.
 * @returns The RGB array.
 * @throws If the HS array is invalid.
 */
export const hs2rgb = (hs: [number, number]): [number, number, number] =>
  hsv2rgb([hs[0], hs[1], 1]);

/**
 * Converts a theme color string to a hex color string.
 * @param themeColor - The theme color string to convert.
 * @returns The hex color string.
 * @throws If the theme color string is invalid.
 */
export function theme2hex(themeColor: string): string {
  const parsed = parse(themeColor);
  if (parsed) {
    return formatHex(parsed) ?? themeColor;
  }

  // Return as-is if not parseable (CSS vars, invalid colors, etc.)
  return themeColor;
}
