// From https://github.com/gka/chroma.js
// Copyright (c) 2011-2019, Gregor Aisch

export type LabColor = [number, number, number];

export const labDarken = (lab: LabColor, amount = 1): LabColor => [
  lab[0] - 18 * amount,
  lab[1],
  lab[2],
];

export const labBrighten = (lab: LabColor, amount = 1): LabColor =>
  labDarken(lab, -amount);
