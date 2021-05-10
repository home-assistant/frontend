import { expandHex } from "./hex";

const rgb_hex = (component: number): string => {
  const hex = Math.round(Math.min(Math.max(component, 0), 255)).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
};

// Conversion between HEX and RGB

export const hex2rgb = (hex: string): [number, number, number] => {
  hex = expandHex(hex);

  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
  ];
};

export const rgb2hex = (rgb: [number, number, number]): string =>
  `#${rgb_hex(rgb[0])}${rgb_hex(rgb[1])}${rgb_hex(rgb[2])}`;

// Conversion between LAB, XYZ and RGB from https://github.com/gka/chroma.js
// Copyright (c) 2011-2019, Gregor Aisch

// Constants for XYZ and LAB conversion
const Xn = 0.95047;
const Yn = 1;
const Zn = 1.08883;

const t0 = 0.137931034; // 4 / 29
const t1 = 0.206896552; // 6 / 29
const t2 = 0.12841855; // 3 * t1 * t1
const t3 = 0.008856452; // t1 * t1 * t1

const rgb_xyz = (r: number) => {
  r /= 255;
  if (r <= 0.04045) {
    return r / 12.92;
  }
  return ((r + 0.055) / 1.055) ** 2.4;
};

const xyz_lab = (t: number) => {
  if (t > t3) {
    return t ** (1 / 3);
  }
  return t / t2 + t0;
};

const xyz_rgb = (r: number) =>
  255 * (r <= 0.00304 ? 12.92 * r : 1.055 * r ** (1 / 2.4) - 0.055);

const lab_xyz = (t: number) => (t > t1 ? t * t * t : t2 * (t - t0));

// Conversions between RGB and LAB

const rgb2xyz = (rgb: [number, number, number]): [number, number, number] => {
  let [r, g, b] = rgb;
  r = rgb_xyz(r);
  g = rgb_xyz(g);
  b = rgb_xyz(b);
  const x = xyz_lab((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / Xn);
  const y = xyz_lab((0.2126729 * r + 0.7151522 * g + 0.072175 * b) / Yn);
  const z = xyz_lab((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / Zn);
  return [x, y, z];
};

export const rgb2lab = (
  rgb: [number, number, number]
): [number, number, number] => {
  const [x, y, z] = rgb2xyz(rgb);
  const l = 116 * y - 16;
  return [l < 0 ? 0 : l, 500 * (x - y), 200 * (y - z)];
};

export const lab2rgb = (
  lab: [number, number, number]
): [number, number, number] => {
  const [l, a, b] = lab;

  let y = (l + 16) / 116;
  let x = isNaN(a) ? y : y + a / 500;
  let z = isNaN(b) ? y : y - b / 200;

  y = Yn * lab_xyz(y);
  x = Xn * lab_xyz(x);
  z = Zn * lab_xyz(z);

  const r = xyz_rgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z); // D65 -> sRGB
  const g = xyz_rgb(-0.969266 * x + 1.8760108 * y + 0.041556 * z);
  const b_ = xyz_rgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z);

  return [r, g, b_];
};

export const lab2hex = (lab: [number, number, number]): string => {
  const rgb = lab2rgb(lab);
  return rgb2hex(rgb);
};

export const rgb2hsv = (
  rgb: [number, number, number]
): [number, number, number] => {
  const [r, g, b] = rgb;
  const v = Math.max(r, g, b);
  const c = v - Math.min(r, g, b);
  const h =
    c && (v === r ? (g - b) / c : v === g ? 2 + (b - r) / c : 4 + (r - g) / c);
  return [60 * (h < 0 ? h + 6 : h), v && c / v, v];
};

export const hsv2rgb = (
  hsv: [number, number, number]
): [number, number, number] => {
  const [h, s, v] = hsv;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  };
  return [f(5), f(3), f(1)];
};

export const rgb2hs = (rgb: [number, number, number]): [number, number] =>
  rgb2hsv(rgb).slice(0, 2) as [number, number];

export const hs2rgb = (hs: [number, number]): [number, number, number] =>
  hsv2rgb([hs[0], hs[1], 255]);
