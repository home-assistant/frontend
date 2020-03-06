import { luminanace } from "./luminanace";

export const contrast = (
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number => {
  const lum1 = luminanace(...rgb1);
  const lum2 = luminanace(...rgb2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};
