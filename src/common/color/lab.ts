// From https://github.com/gka/chroma.js
// Copyright (c) 2011-2019, Gregor Aisch

export const labDarken = (
  lab: [number, number, number],
  amount = 1
): [number, number, number] => [lab[0] - 18 * amount, lab[1], lab[2]];

export const labBrighten = (
  lab: [number, number, number],
  amount = 1
): [number, number, number] => labDarken(lab, -amount);
