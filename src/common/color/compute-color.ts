import { hex2rgb } from "./convert-color";

export const COLORS = [
  "red",
  "pink",
  "purple",
  "deep-purple",
  "indigo",
  "blue",
  "light-blue",
  "cyan",
  "teal",
  "green",
  "light-green",
  "lime",
  "yellow",
  "amber",
  "orange",
  "deep-orange",
  "brown",
  "grey",
  "blue-grey",
  "black",
  "white",
];

export function computeRgbColor(color: string): string {
  if (COLORS.includes(color)) {
    return `var(--rgb-${color}-color)`;
  }
  if (color.startsWith("#")) {
    try {
      return hex2rgb(color).join(", ");
    } catch (err) {
      return "";
    }
  }
  return color;
}
