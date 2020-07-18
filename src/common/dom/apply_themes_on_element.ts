import { derivedStyles, darkStyles } from "../../resources/styles";
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
  selectedTheme?: string,
  themeOptions?: Partial<HomeAssistant["selectedTheme"]>
) => {
  let cacheKey = selectedTheme;
  let themeRules: Partial<Theme> | undefined;

  if (selectedTheme === "default" && themeOptions) {
    if (themeOptions.dark) {
      cacheKey = `${cacheKey}__dark`;
      themeRules = { ...themeRules, ...darkStyles };
    }
    if (themeOptions.primaryColor) {
      cacheKey = `${cacheKey}__primary_${themeOptions.primaryColor}`;
      themeRules = {
        ...themeRules,
        "primary-color": themeOptions.primaryColor,
      };
    }
    if (themeOptions.accentColor) {
      cacheKey = `${cacheKey}__accent_${themeOptions.accentColor}`;
      themeRules = {
        ...themeRules,
        "accent-color": themeOptions.accentColor,
      };
    }
  }

  if (selectedTheme && themes.themes[selectedTheme]) {
    themeRules = { ...themeRules, ...themes.themes[selectedTheme] };
  }

  if (!element._themes && !themeRules) {
    // No styles to reset, and no styles to set
    return;
  }

  const newTheme =
    themeRules && cacheKey
      ? PROCESSED_THEMES[cacheKey] || processTheme(cacheKey, themeRules)
      : undefined;

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
  cacheKey: string,
  theme: Partial<Theme>
): ProcessedTheme | undefined => {
  if (!theme) {
    return undefined;
  }
  const combinedTheme: Partial<Theme> = {
    ...derivedStyles,
    ...theme,
  };
  const styles = {};
  const keys = {};
  for (const key of Object.keys(combinedTheme)) {
    const prefixedKey = `--${key}`;
    const value = combinedTheme[key]!;
    styles[prefixedKey] = value;
    keys[prefixedKey] = "";

    // Try to create a rgb value for this key if it is a hex color
    if (!value.startsWith("#")) {
      // Not a hex color
      continue;
    }
    const rgbKey = `rgb-${key}`;
    if (combinedTheme[rgbKey] !== undefined) {
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
  PROCESSED_THEMES[cacheKey] = { styles, keys };
  return { styles, keys };
};

export const invalidateThemeCache = () => {
  PROCESSED_THEMES = {};
};
