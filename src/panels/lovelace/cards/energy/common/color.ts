import {
  hex2rgb,
  lab2rgb,
  rgb2hex,
  rgb2lab,
  theme2hex,
} from "../../../../../common/color/convert-color";
import { labBrighten, labDarken } from "../../../../../common/color/lab";

/**
 * Series indices below this keep the legacy lightness stepping, so dashboards
 * with only a few sources of a kind look exactly like before.
 */
const HUE_ROTATION_START_IDX = 3;

/** Hue offset per additional series, in degrees (golden angle). */
const GOLDEN_ANGLE_DEG = 137.5;

/**
 * Below this chroma the base color is effectively grey, and a hue rotation
 * alone cannot separate the series. Bump chroma so rotation has an effect.
 */
const GREYISH_CHROMA_THRESHOLD = 8;
const FALLBACK_CHROMA = 25;

/**
 * Keep the lightness of rotated series inside a readable band; lightness
 * laddering has already collapsed by the time we rotate, so walk gently back
 * toward the base instead of compounding the old +-18/index steps.
 */
const LIGHTNESS_BAND_MIN = 35;
const LIGHTNESS_BAND_MAX = 75;
const LIGHTNESS_STEP_PER_INDEX = 4;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function getEnergyColor(
  computedStyles: CSSStyleDeclaration,
  darkMode: boolean,
  background: boolean,
  compare: boolean,
  propertyName: string,
  idx?: number
): string {
  const themeIdxColor = computedStyles
    .getPropertyValue(propertyName + "-" + idx)
    .trim();

  const themeColor =
    themeIdxColor.length > 0
      ? themeIdxColor
      : computedStyles.getPropertyValue(propertyName).trim();

  let hexColor = theme2hex(themeColor);

  if (themeIdxColor.length === 0 && idx) {
    if (idx < HUE_ROTATION_START_IDX) {
      // Legacy behaviour: lightness stepping for the first two extra series.
      // Identical output to the previous implementation.
      hexColor = rgb2hex(
        lab2rgb(
          darkMode
            ? labBrighten(rgb2lab(hex2rgb(hexColor)), idx)
            : labDarken(rgb2lab(hex2rgb(hexColor)), idx)
        )
      );
    } else {
      // Three or more sources of a kind: lightness alone is no longer
      // distinguishable. Separate additional series by hue instead, spaced
      // by the golden angle so any number of series stays well separated.
      // Chroma is inherited from the base color (respecting muted themes),
      // only rescued from near-grey so rotation has an effect. Lightness
      // walks gently back toward the base inside a readable band.
      const rotationIndex = idx - (HUE_ROTATION_START_IDX - 1);
      const [l, a, b] = rgb2lab(hex2rgb(hexColor));

      let chroma = Math.hypot(a, b);
      if (chroma < GREYISH_CHROMA_THRESHOLD) {
        chroma = FALLBACK_CHROMA;
      }

      const hue =
        Math.atan2(b, a) + (rotationIndex * GOLDEN_ANGLE_DEG * Math.PI) / 180;

      const targetL = clamp(
        l + (darkMode ? 1 : -1) * LIGHTNESS_STEP_PER_INDEX * rotationIndex,
        LIGHTNESS_BAND_MIN,
        LIGHTNESS_BAND_MAX
      );

      hexColor = rgb2hex(
        lab2rgb([targetL, chroma * Math.cos(hue), chroma * Math.sin(hue)])
      );
    }
  }

  if (compare) {
    if (background) {
      hexColor += "32";
    } else {
      hexColor += "7F";
    }
  } else if (background) {
    hexColor += "7F";
  }
  return hexColor;
}
