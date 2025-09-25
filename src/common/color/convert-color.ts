import {
  convertHsvToRgb,
  convertLabToRgb,
  convertRgbToHsv,
  convertRgbToLab,
  formatHex,
  parse,
} from "culori";

// Conversion between HEX and RGB

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

export const rgb2hex = (rgb: [number, number, number]): string => {
  const hex = formatHex({
    mode: "rgb",
    r: rgb[0] / 255,
    g: rgb[1] / 255,
    b: rgb[2] / 255,
  });
  return hex || "#000000";
};

// Conversions between RGB and LAB

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

export const lab2hex = (lab: [number, number, number]): string => {
  const rgb = lab2rgb(lab);
  return rgb2hex(rgb);
};

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

export const rgb2hs = (rgb: [number, number, number]): [number, number] =>
  rgb2hsv(rgb).slice(0, 2) as [number, number];

export const hs2rgb = (hs: [number, number]): [number, number, number] =>
  hsv2rgb([hs[0], hs[1], 1]);

export function theme2hex(themeColor: string): string {
  const parsed = parse(themeColor);
  if (parsed) {
    return formatHex(parsed) ?? themeColor;
  }

  // Return as-is if not parseable (CSS vars, invalid colors, etc.)
  return themeColor;
}
