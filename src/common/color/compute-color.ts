import { hex2rgb } from "./convert-color";

export const THEME_COLORS = new Set(["primary", "accent", "disabled"]);

export const COLORS = new Map([
  ["red", "#f44336"],
  ["pink", "#e91e63"],
  ["purple", "#9b27b0"],
  ["deep-purple", "#683ab7"],
  ["indigo", "#3f51b5"],
  ["blue", "#2194f3"],
  ["light-blue", "#2196f3"],
  ["cyan", "#03a8f4"],
  ["teal", "#009688"],
  ["green", "#4caf50"],
  ["light-green", "#8bc34a"],
  ["lime", "#ccdc39"],
  ["yellow", "#ffeb3b"],
  ["amber", "#ffc107"],
  ["orange", "#ff9800"],
  ["deep-orange", "#ff5722"],
  ["brown", "#795548"],
  ["grey", "#9e9e9e"],
  ["blue-grey", "#607d8b"],
  ["black", "#000000"],
  ["white", "ffffff"],
]);

export function computeRgbColor(color: string): string {
  if (THEME_COLORS.has(color)) {
    return `var(--rgb-${color}-color)`;
  }
  if (COLORS.has(color)) {
    return hex2rgb(COLORS.get(color)!).join(", ");
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
