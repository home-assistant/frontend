import colors from "color-name";
import {
  hex2rgb,
  lab2rgb,
  rgb2hex,
  rgb2lab,
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

  let hexColor;
  if (themeColor.startsWith("#")) {
    hexColor = themeColor;
  } else {
    const rgbFromColorName = colors[themeColor];
    if (!rgbFromColorName) {
      // We have a named color, and there's nothing in the table,
      // so nothing further we can do with it.
      // Compare/border/background color will all be the same.
      return themeColor;
    }
    hexColor = rgb2hex(rgbFromColorName);
  }

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
