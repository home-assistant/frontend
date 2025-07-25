import { formatHex, oklch, wcagLuminance, type Oklch } from "culori";

const MIN_LUMINANCE = 0.3;
const MAX_LUMINANCE = 0.6;

/**
 * Normalizes the luminance of a given color to ensure it falls within the specified minimum and maximum luminance range.
 * This helps to keep everything readable and accessible, especially for text and UI elements.
 *
 * This function converts the input color to the OKLCH color space, calculates its luminance,
 * and adjusts the lightness component if the luminance is outside the allowed range.
 * The adjustment is performed using a binary search to find the appropriate lightness value.
 * If the color is already within the range, it is returned unchanged.
 *
 * @param color - HEX color string
 * @returns The normalized color as a hex string, or the original color if normalization is not needed.
 * @throws If the provided color is invalid or cannot be parsed.
 */
export const normalizeLuminance = (color: string): string => {
  const baseOklch = oklch(color);

  if (baseOklch === undefined) {
    throw new Error("Invalid color provided");
  }

  const luminance = wcagLuminance(baseOklch);

  if (luminance >= MIN_LUMINANCE && luminance <= MAX_LUMINANCE) {
    return color;
  }
  const targetLuminance =
    luminance < MIN_LUMINANCE ? MIN_LUMINANCE : MAX_LUMINANCE;

  function findLightness(lowL = 0, highL = 1, iterations = 10) {
    if (iterations <= 0) {
      return (lowL + highL) / 2;
    }

    const midL = (lowL + highL) / 2;
    const testColor = { ...baseOklch, l: midL } as Oklch;
    const testLuminance = wcagLuminance(testColor);

    if (Math.abs(testLuminance - targetLuminance) < 0.01) {
      return midL;
    }
    if (testLuminance < targetLuminance) {
      return findLightness(midL, highL, iterations--);
    }
    return findLightness(lowL, midL, iterations--);
  }

  baseOklch.l = findLightness();

  return formatHex(baseOklch) || color;
};

/**
 * Generates a color palette based on a base color using the OKLCH color space.
 *
 * The palette consists of multiple shades, both lighter and darker than the base color,
 * calculated by adjusting the lightness and chroma values. Each shade is labeled and
 * returned as a tuple containing the shade name and its hexadecimal color value.
 *
 * @param baseColor - The base color in a HEX format.
 * @param label - A string label used to name each color variant in the palette.
 * @param steps - An array of numbers representing the percentage steps for generating shades (default: [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95]).
 * @returns An array of tuples, each containing the shade name and its corresponding hex color value.
 * @throws If the provided base color is invalid or cannot be parsed by the `oklch` function.
 */
export const generateColorPalette = (
  baseColor: string,
  label: string,
  steps = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95]
) => {
  const baseOklch = oklch(baseColor);

  if (baseOklch === undefined) {
    throw new Error("Invalid base color provided");
  }

  return steps.map((step) => {
    const name = `color-${label}-${step}`;

    // Base color at 50%
    if (step === 50) {
      return [name, formatHex(baseOklch)];
    }

    // For darker shades (below 50%)
    if (step < 50) {
      const darkFactor = step / 50;

      // Adjust lightness and chroma to create darker variants
      const darker = {
        ...baseOklch,
        l: baseOklch.l * darkFactor, // darkening
        c: baseOklch.c * (0.9 + 0.1 * darkFactor), // Slightly adjust chroma
      };

      return [name, formatHex(darker)];
    }

    // For lighter shades (above 50%)
    const lightFactor = (step - 50) / 45; // Normalized from 0 to 1

    // Adjust lightness and reduce chroma for lighter variants
    const lighter = {
      ...baseOklch,
      l: Math.min(1, baseOklch.l + (1 - baseOklch.l) * lightFactor), // Increase lightness
      c: baseOklch.c * Math.max(0, 1 - lightFactor * 0.7), // Gradually reduce chroma
    };

    return [name, formatHex(lighter)];
  });
};
