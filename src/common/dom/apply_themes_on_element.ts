import { derivedStyles } from "../../resources/styles";
import { HomeAssistant } from "../../types";

const hexToRgb = (hex: string): string | null => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const checkHex = hex.replace(shorthandRegex, (_m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(checkHex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}`
    : null;
};

const HEX_TO_RGB_LOOKUP = {};

/**
 * Apply a theme to an element by setting the CSS variables on it.
 *
 * element: Element to apply theme on.
 * themes: HASS Theme information
 * selectedTheme: selected theme.
 */
export const applyThemesOnElement = (
  element,
  themes: HomeAssistant["themes"],
  selectedTheme?: string
) => {
  const newTheme = selectedTheme ? themes.themes[selectedTheme] : undefined;

  if (!element._themes && !newTheme) {
    // No styles to reset, and no styles to set
    return;
  }

  // Add previous set keys to reset them
  const styles = element._themes ? { ...element._themes } : {};

  if (newTheme) {
    element._themes = {};
    const theme = {
      ...derivedStyles,
      ...newTheme,
    };
    for (const key of Object.keys(theme)) {
      const prefixedKey = `--${key}`;
      const value = theme[key];
      // Save key so we can reset it later if needed
      element._themes[prefixedKey] = "";
      styles[prefixedKey] = value;

      // Try to create a rgb value for this key if it is a hex color
      if (!value.startsWith("#")) {
        // Not a hex color
        continue;
      }
      const rgbKey = `rgb-${key}`;
      if (theme[rgbKey] !== undefined) {
        // Theme has it's own rgb value
        continue;
      }
      let rgbValue = HEX_TO_RGB_LOOKUP[value];
      if (rgbValue === undefined) {
        rgbValue = HEX_TO_RGB_LOOKUP[value] = hexToRgb(value);
      }
      if (rgbValue !== null) {
        const prefixedRgbKey = `--${rgbKey}`;
        // Save key so we can reset it later if needed
        element._themes[prefixedRgbKey] = "";
        styles[prefixedRgbKey] = rgbValue;
      }
    }
  }

  // Set and/or reset styles
  if (element.updateStyles) {
    element.updateStyles(styles);
  } else if (window.ShadyCSS) {
    // Implement updateStyles() method of Polymer elements
    window.ShadyCSS.styleSubtree(/** @type {!HTMLElement} */ element, styles);
  }
};
