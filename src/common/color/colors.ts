import memoizeOne from "memoize-one";
import { theme2hex } from "./convert-color";

// Total number of colors defined in CSS variables (--color-1 through --color-54)
export const COLORS_COUNT = 54;

export function getColorByIndex(
  index: number,
  style: CSSStyleDeclaration
): string {
  // Wrap around using modulo to support unlimited indices
  const colorIndex = (index % COLORS_COUNT) + 1;
  return style.getPropertyValue(`--color-${colorIndex}`);
}

export function getGraphColorByIndex(
  index: number,
  style: CSSStyleDeclaration
): string {
  // The CSS vars for the colors use range 1..n, so we need to adjust the index from the internal 0..n color index range.
  const themeColor =
    style.getPropertyValue(`--graph-color-${index + 1}`) ||
    getColorByIndex(index, style);
  return theme2hex(themeColor);
}

export const getAllGraphColors = memoizeOne(
  (style: CSSStyleDeclaration) =>
    Array.from({ length: COLORS_COUNT }, (_, index) =>
      getGraphColorByIndex(index, style)
    ),
  (newArgs: [CSSStyleDeclaration], lastArgs: [CSSStyleDeclaration]) =>
    // this is not ideal, but we need to memoize the colors
    newArgs[0].getPropertyValue("--graph-color-1") ===
      lastArgs[0].getPropertyValue("--graph-color-1") &&
    newArgs[0].getPropertyValue("--color-1") ===
      lastArgs[0].getPropertyValue("--color-1")
);
