import memoizeOne from "memoize-one";
import { theme2hex } from "./convert-color";

export const COLORS = [
  "#4269d0",
  "#f4bd4a",
  "#ff725c",
  "#6cc5b0",
  "#a463f2",
  "#ff8ab7",
  "#9c6b4e",
  "#97bbf5",
  "#01ab63",
  "#094bad",
  "#c99000",
  "#d84f3e",
  "#49a28f",
  "#048732",
  "#d96895",
  "#8043ce",
  "#7599d1",
  "#7a4c31",
  "#6989f4",
  "#ffd444",
  "#ff957c",
  "#8fe9d3",
  "#62cc71",
  "#ffadda",
  "#c884ff",
  "#badeff",
  "#bf8b6d",
  "#927acc",
  "#97ee3f",
  "#bf3947",
  "#9f5b00",
  "#f48758",
  "#8caed6",
  "#f2b94f",
  "#eff26e",
  "#e43872",
  "#d9b100",
  "#9d7a00",
  "#698cff",
  "#00d27e",
  "#d06800",
  "#009f82",
  "#c49200",
  "#cbe8ff",
  "#fecddf",
  "#c27eb6",
  "#8cd2ce",
  "#c4b8d9",
  "#f883b0",
  "#a49100",
  "#f48800",
  "#27d0df",
  "#a04a9b",
];

export function getColorByIndex(index: number) {
  return COLORS[index % COLORS.length];
}

export function getGraphColorByIndex(
  index: number,
  style: CSSStyleDeclaration
): string {
  // The CSS vars for the colors use range 1..n, so we need to adjust the index from the internal 0..n color index range.
  const themeColor =
    style.getPropertyValue(`--graph-color-${index + 1}`) ||
    getColorByIndex(index);
  return theme2hex(themeColor);
}

export const getAllGraphColors = memoizeOne(
  (style: CSSStyleDeclaration) =>
    COLORS.map((_color, index) => getGraphColorByIndex(index, style)),
  (newArgs: [CSSStyleDeclaration], lastArgs: [CSSStyleDeclaration]) =>
    // this is not ideal, but we need to memoize the colors
    newArgs[0].getPropertyValue("--graph-color-1") ===
    lastArgs[0].getPropertyValue("--graph-color-1")
);
