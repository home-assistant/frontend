import { derivedStyles, darkStyles } from "../../resources/styles";
import { HomeAssistant, Theme } from "../../types";
import { hsl2hex, hex2rgb, rgb2hsl } from "../color/convert-color";
import { hslLighten, hslDarken, hslDesaturate } from "../color/hsl";
import { rgbContrast } from "../color/rgb";

interface ProcessedTheme {
  keys: { [key: string]: "" };
  styles: { [key: string]: string };
}

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
  let themeRules: Partial<Theme> = {};

  if (selectedTheme === "default" && themeOptions) {
    if (themeOptions.dark) {
      cacheKey = `${cacheKey}__dark`;
      themeRules = darkStyles;
    }
    if (themeOptions.primaryColor) {
      cacheKey = `${cacheKey}__primary_${themeOptions.primaryColor}`;
      const rgbPrimaryColor = hex2rgb(themeOptions.primaryColor);
      const hslPrimaryColor = rgb2hsl(rgbPrimaryColor);
      themeRules["primary-color"] = themeOptions.primaryColor;
      themeRules["light-primary-color"] = hsl2hex(
        hslLighten(hslPrimaryColor, 0.5)
      );
      themeRules["dark-primary-color"] = hsl2hex(
        hslDarken(hslPrimaryColor, 0.5)
      );
      themeRules["text-primary-color"] =
        rgbContrast(rgbPrimaryColor, [255, 255, 255]) > 2.6
          ? "#fff"
          : "#212121";
      themeRules["state-icon-color"] = hsl2hex(
        hslDesaturate(hslPrimaryColor, 0.5)
      );
    }
    if (themeOptions.accentColor) {
      cacheKey = `${cacheKey}__accent_${themeOptions.accentColor}`;
      themeRules["accent-color"] = themeOptions.accentColor;
    }
  }

  if (selectedTheme && themes.themes[selectedTheme]) {
    themeRules = { ...themeRules, ...themes.themes[selectedTheme] };
  }

  if (!element._themes && !Object.keys(themeRules).length) {
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

    // Try to create a rgb value for this key if it is not a var
    if (!value.startsWith("#")) {
      // Can't convert non hex value
      continue;
    }

    const rgbKey = `rgb-${key}`;
    if (combinedTheme[rgbKey] !== undefined) {
      // Theme has it's own rgb value
      continue;
    }
    try {
      const rgbValue = hex2rgb(value).join(",");
      const prefixedRgbKey = `--${rgbKey}`;
      styles[prefixedRgbKey] = rgbValue;
      keys[prefixedRgbKey] = "";
    } catch (e) {
      continue;
    }
  }
  PROCESSED_THEMES[cacheKey] = { styles, keys };
  return { styles, keys };
};

export const invalidateThemeCache = () => {
  PROCESSED_THEMES = {};
};
