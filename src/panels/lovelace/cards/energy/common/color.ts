import {
  hex2rgb,
  lab2rgb,
  rgb2hex,
  rgb2lab,
  theme2hex,
} from "../../../../../common/color/convert-color";
import { labBrighten, labDarken } from "../../../../../common/color/lab";

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
