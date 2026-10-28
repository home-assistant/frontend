import {
  hex2rgb,
  lab2rgb,
  rgb2hex,
  rgb2lab,
  theme2hex,
} from "../../../../../common/color/convert-color";

const HUE_STEP_DEG = 14;
const MAX_HUE_OFFSET_DEG = 42; // stay within the family
const MAX_LIGHTNESS_OFFSET = 24;
const LIGHTNESS_STEP = 6;
const LIGHTNESS_BAND_MIN = 35;
const LIGHTNESS_BAND_MAX = 75;
const GREYISH_CHROMA_THRESHOLD = 8;
const FALLBACK_CHROMA = 25;

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
    const [l, a, b] = rgb2lab(hex2rgb(hexColor));
    let chroma = Math.hypot(a, b);
    if (chroma < GREYISH_CHROMA_THRESHOLD) {
      chroma = FALLBACK_CHROMA;
    }
    const step = Math.ceil(idx / 2);
    const direction = idx % 2 === 0 ? -1 : 1;
    const hue =
      Math.atan2(b, a) +
      (direction *
        Math.min(step * HUE_STEP_DEG, MAX_HUE_OFFSET_DEG) *
        Math.PI) /
        180;
    const targetL = Math.min(
      LIGHTNESS_BAND_MAX,
      Math.max(
        LIGHTNESS_BAND_MIN,
        l +
          direction *
            (darkMode ? 1 : -1) *
            Math.min(step * LIGHTNESS_STEP, MAX_LIGHTNESS_OFFSET)
      )
    );
    hexColor = rgb2hex(
      lab2rgb([targetL, chroma * Math.cos(hue), chroma * Math.sin(hue)])
    );
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
