import { hex2rgb } from "./convert-color";

export const THEME_COLORS = new Set([
  "primary",
  "accent",
  "disabled",
  "inactive",
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
]);

export function computeRgbColor(color: string): string {
  if (THEME_COLORS.has(color)) {
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
