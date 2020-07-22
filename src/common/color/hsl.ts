export const hslDarken = (hsl: [number, number, number], ratio: number) => {
  hsl[2] -= hsl[2] * ratio;
  return hsl;
};

export const hslLighten = (hsl: [number, number, number], ratio: number) => {
  hsl[2] += hsl[2] * ratio;
  return hsl;
};

export const hslDesaturate = (hsl: [number, number, number], ratio: number) => {
  hsl[1] -= hsl[1] * ratio;
  return hsl;
};
