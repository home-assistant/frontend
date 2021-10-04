export const luminosity = (rgb: [number, number, number]): number => {
  // http://www.w3.org/TR/WCAG20/#relativeluminancedef
  const lum: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < rgb.length; i++) {
    const chan = rgb[i] / 255;
    lum[i] = chan <= 0.03928 ? chan / 12.92 : ((chan + 0.055) / 1.055) ** 2.4;
  }

  return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
};

export const rgbContrast = (
  color1: [number, number, number],
  color2: [number, number, number]
) => {
  const lum1 = luminosity(color1);
  const lum2 = luminosity(color2);

  if (lum1 > lum2) {
    return (lum1 + 0.05) / (lum2 + 0.05);
  }

  return (lum2 + 0.05) / (lum1 + 0.05);
};

export const getRGBContrastRatio = (
  rgb1: [number, number, number],
  rgb2: [number, number, number]
) => Math.round((rgbContrast(rgb1, rgb2) + Number.EPSILON) * 100) / 100;
