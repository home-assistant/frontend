import { hex2rgb, rgb2hex } from "../../../../common/color/convert-color";
import { clamp } from "../../../../common/number/clamp";

type RGB = [number, number, number];

const PALETTE_MIN = -6;

const PALETTE_HEX = [
  "#249df2", // -6
  "#239dec", // -5
  "#239fec", // -4
  "#23a3eb", // -3
  "#23a6eb", // -2
  "#23a9e9", // -1
  "#22abe6", // 0
  "#22aee4", // 1
  "#22b1e0", // 2
  "#21b1dd", // 3
  "#23b6da", // 4
  "#28b8d6", // 5
  "#2abdd3", // 6
  "#2fbfcf", // 7
  "#34c4cc", // 8
  "#36c6c9", // 9
  "#43c9c0", // 10
  "#59c9b3", // 11
  "#6fc9a3", // 12
  "#82c992", // 13
  "#98c985", // 14
  "#a8c977", // 15
  "#b9c762", // 16
  "#c7c74d", // 17
  "#d1be31", // 18
  "#dbb921", // 19
  "#e6ba22", // 20
  "#ecc123", // 21
  "#ecba23", // 22
  "#eeb424", // 23
  "#ecaa23", // 24
  "#eca023", // 25
  "#ec9723", // 26
  "#ec8f23", // 27
  "#ec8523", // 28
  "#ec7c23", // 29
  "#ee7f24", // 30
  "#e67122", // 31
  "#df6321", // 32
  "#df5b21", // 33
  "#dd5421", // 34
  "#db4c21", // 35
  "#db4121", // 36
  "#db3721", // 37
  "#d62f20", // 38
  "#cc301f", // 39
  "#c22a1d", // 40
  "#ca2d1e", // 41
  "#c82c1d", // 42
];

const PALETTE_MAX = PALETTE_MIN + PALETTE_HEX.length - 1;
const PALETTE: RGB[] = PALETTE_HEX.map((hex) => hex2rgb(hex));

const paletteAt = (tempC: number): RGB => {
  const clamped = Math.max(PALETTE_MIN, Math.min(PALETTE_MAX, tempC));
  const idx = clamped - PALETTE_MIN;
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, PALETTE.length - 1);
  const frac = idx - i0;
  const a = PALETTE[i0];
  const b = PALETTE[i1];
  return [
    a[0] + (b[0] - a[0]) * frac,
    a[1] + (b[1] - a[1]) * frac,
    a[2] + (b[2] - a[2]) * frac,
  ];
};

export interface GradientStop {
  offset: number;
  color: string;
}

const buildStops = (
  min: number,
  max: number,
  nStops: number,
  tEffFor: (temp: number) => number
): GradientStop[] => {
  const stops: GradientStop[] = [];
  for (let i = 0; i < nStops; i++) {
    const offset = i / (nStops - 1);
    const temp = max + offset * (min - max);
    stops.push({ offset, color: rgb2hex(paletteAt(tEffFor(temp))) });
  }
  return stops;
};

export const getAbsoluteGradient = (
  min: number,
  max: number,
  nStops = 5
): GradientStop[] => buildStops(min, max, nStops, (temp) => temp);

// Compression scales with the midpoint: cool ranges stay near-uniform, warm
// ranges spread wider across the palette.
export const getRelativeGradient = (
  min: number,
  max: number,
  nStops = 5
): GradientStop[] => {
  const mid = (min + max) / 2;
  const compression = clamp(-0.15 + 0.025 * mid, 0.05, 1);
  return buildStops(
    min,
    max,
    nStops,
    (temp) => mid + compression * (temp - mid)
  );
};
