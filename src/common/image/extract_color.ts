// We import the minified bundle because the unminified bundle
// has some quirks that break wds. See #7784 for unminified version.
import type { Swatch, Vec3 } from "@vibrant/color";
import Vibrant from "node-vibrant/dist/vibrant";
import { getRGBContrastRatio } from "../color/rgb";

const CONTRAST_RATIO = 4.5;

// How much the total diff between 2 RGB colors can be
// to be considered similar.
const COLOR_SIMILARITY_THRESHOLD = 150;

// For debug purposes, is being tree shaken.
const DEBUG_COLOR = __DEV__ && false;

const logColor = (
  color: Swatch,
  label = `${color.hex} - ${color.population}`
) =>
  // eslint-disable-next-line no-console
  console.log(
    `%c${label}`,
    `color: ${color.bodyTextColor}; background-color: ${color.hex}`
  );

const customGenerator = (colors: Swatch[]) => {
  colors.sort((colorA, colorB) => colorB.population - colorA.population);

  const backgroundColor = colors[0];
  let foregroundColor: Vec3 | undefined;

  const contrastRatios = new Map<string, number>();
  const approvedContrastRatio = (hex: string, rgb: Swatch["rgb"]) => {
    if (!contrastRatios.has(hex)) {
      contrastRatios.set(hex, getRGBContrastRatio(backgroundColor.rgb, rgb));
    }

    return contrastRatios.get(hex)! > CONTRAST_RATIO;
  };

  // We take each next color and find one that has better contrast.
  for (let i = 1; i < colors.length && foregroundColor === undefined; i++) {
    // If this color matches, score, take it.
    if (approvedContrastRatio(colors[i].hex, colors[i].rgb)) {
      if (DEBUG_COLOR) {
        logColor(colors[i], "PICKED");
      }
      foregroundColor = colors[i].rgb;
      break;
    }

    // This color has the wrong contrast ratio, but it is the right color.
    // Let's find similar colors that might have the right contrast ratio

    const currentColor = colors[i];
    if (DEBUG_COLOR) {
      logColor(colors[i], "Finding similar color with better contrast");
    }

    for (let j = i + 1; j < colors.length; j++) {
      const compareColor = colors[j];

      // difference. 0 is same, 765 max difference
      const diffScore =
        Math.abs(currentColor.rgb[0] - compareColor.rgb[0]) +
        Math.abs(currentColor.rgb[1] - compareColor.rgb[1]) +
        Math.abs(currentColor.rgb[2] - compareColor.rgb[2]);

      if (DEBUG_COLOR) {
        logColor(colors[j], `${colors[j].hex} - ${diffScore}`);
      }

      if (diffScore > COLOR_SIMILARITY_THRESHOLD) {
        continue;
      }

      if (approvedContrastRatio(compareColor.hex, compareColor.rgb)) {
        if (DEBUG_COLOR) {
          logColor(compareColor, "PICKED");
        }
        foregroundColor = compareColor.rgb;
        break;
      }
    }
  }

  if (foregroundColor === undefined) {
    foregroundColor =
      // @ts-expect-error
      backgroundColor.getYiq() < 200 ? [255, 255, 255] : [0, 0, 0];
  }

  if (DEBUG_COLOR) {
    // eslint-disable-next-line no-console
    console.log();
    // eslint-disable-next-line no-console
    console.log(
      "%cPicked colors",
      `color: ${foregroundColor}; background-color: ${backgroundColor.hex}; font-weight: bold; padding: 16px;`
    );
    colors.forEach((color) => logColor(color));
    // eslint-disable-next-line no-console
    console.log();
  }

  return {
    // We can't import Swatch constructor from the minified bundle, take it from background color.
    // @ts-expect-error
    foreground: new backgroundColor.constructor(foregroundColor, 0),
    background: backgroundColor,
  };
};

// Set our custom generator as the default.
Vibrant._pipeline.generator.register("default", customGenerator);

export const extractColors = (url: string, downsampleColors = 16) =>
  new Vibrant(url, {
    colorCount: downsampleColors,
  })
    .getPalette()
    .then(({ foreground, background }) => ({
      background: background!,
      foreground: foreground!,
    }));
