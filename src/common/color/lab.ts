import type { Lab } from "culori";

export type LabColor = [number, number, number];

/**
 * Darkens a LAB color by a given amount.
 * @param lab - The LAB color to darken.
 * @param amount - The amount to darken the color by.
 * @returns The darkened LAB color.
 */
export const labDarken = (lab: LabColor, amount = 1): LabColor => {
  const labColor: Lab = { mode: "lab", l: lab[0], a: lab[1], b: lab[2] };
  const darkened: Lab = {
    ...labColor,
    l: Math.max(0, labColor.l - 18 * amount),
  };
  return [darkened.l, darkened.a, darkened.b];
};

/**
 * Brightens a LAB color by a given amount.
 * @param lab - The LAB color to brighten.
 * @param amount - The amount to brighten the color by.
 * @returns The brightened LAB color.
 */
export const labBrighten = (lab: LabColor, amount = 1): LabColor => {
  const labColor: Lab = { mode: "lab", l: lab[0], a: lab[1], b: lab[2] };
  const brightened: Lab = {
    ...labColor,
    l: Math.min(100, labColor.l + 18 * amount),
  };
  return [brightened.l, brightened.a, brightened.b];
};
