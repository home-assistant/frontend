import { derivedStyles } from "../../resources/styles";
import { HomeAssistant, Theme } from "../../types";

interface ProcessedTheme {
  keys: { [key: string]: "" };
  styles: { [key: string]: string };
}

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

let PROCESSED_THEMES: { [key: string]: ProcessedTheme } = {};

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
  const newTheme = selectedTheme
    ? PROCESSED_THEMES[selectedTheme] || processTheme(selectedTheme, themes)
    : undefined;

  if (!element._themes && !newTheme) {
    // No styles to reset, and no styles to set
    return;
  }

  // Add previous set keys to reset them, and new theme
  const styles = { ...element._themes, ...newTheme?.styles };
  element._themes = newTheme?.keys;

  // Set and/or reset styles
  if (element.updateStyles) {
    element.updateStyles(styles);
  } else if (window.ShadyCSS) {
    // Implement updateStyles() method of Polymer elements
    window.ShadyCSS.styleSubtree(/** @type {!HTMLElement} */ element, styles);
  }
};

const processTheme = (
  themeName: string,
  themes: HomeAssistant["themes"]
): ProcessedTheme | undefined => {
  if (!themes.themes[themeName]) {
    return;
  }
  const theme: Theme = {
    ...derivedStyles,
    ...themes.themes[themeName],
  };
  const styles = {};
  const keys = {};
  for (const key of Object.keys(theme)) {
    const prefixedKey = `--${key}`;
    const value = theme[key];
    styles[prefixedKey] = value;
    keys[prefixedKey] = "";

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
    const rgbValue = hexToRgb(value);
    if (rgbValue !== null) {
      const prefixedRgbKey = `--${rgbKey}`;
      styles[prefixedRgbKey] = rgbValue;
      keys[prefixedRgbKey] = "";
    }
  }
  PROCESSED_THEMES[themeName] = { styles, keys };
  return { styles, keys };
};

export const invalidateThemeCache = () => {
  PROCESSED_THEMES = {};
};
