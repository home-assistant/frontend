import {
  hex2rgb,
  lab2rgb,
  rgb2hex,
  rgb2lab,
  theme2hex,
} from "../../../../../common/color/convert-color";
import { labBrighten, labDarken } from "../../../../../common/color/lab";
import { getGraphColorByIndex } from "../../../../../common/color/colors";

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

  let themeColor =
    themeIdxColor.length > 0
      ? themeIdxColor
      : computedStyles.getPropertyValue(propertyName).trim();

  if (themeColor.length === 0) {
    // If we don't have a defined color, pick a graph color derived from the hash of the key name.
    const hashCode = propertyName
      .split("")
      // eslint-disable-next-line no-bitwise
      .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
    themeColor = getGraphColorByIndex(Math.abs(hashCode), computedStyles);
  }

  let hexColor = theme2hex(themeColor);

  if (themeIdxColor.length === 0 && idx) {
    // Brighten or darken the color based on set position.
    // Skip if theme already provides a color for this set.

    hexColor = rgb2hex(
      lab2rgb(
        darkMode
          ? labBrighten(rgb2lab(hex2rgb(hexColor)), idx)
          : labDarken(rgb2lab(hex2rgb(hexColor)), idx)
      )
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
