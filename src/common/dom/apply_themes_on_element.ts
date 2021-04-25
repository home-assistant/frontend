import { ThemeVars } from "../../data/ws-themes";
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_ACCENT_COLOR,
} from "../../resources/ha-style";
import { darkStyles, derivedStyles } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import {
  hex2rgb,
  lab2hex,
  lab2rgb,
  rgb2hex,
  rgb2lab,
} from "../color/convert-color";
import { hexBlend } from "../color/hex";
import { labBrighten, labDarken } from "../color/lab";
import { rgbContrast } from "../color/rgb";

interface ProcessedTheme {
  keys: { [key: string]: "" };
  styles: Record<string, string>;
}

let PROCESSED_THEMES: Record<string, ProcessedTheme> = {};

/**
 * Apply a theme to an element by setting the CSS variables on it.
 *
 * element: Element to apply theme on.
 * themes: HASS theme information.
 * selectedTheme: Selected theme.
 * themeSettings: Settings such as selected dark mode and colors.
 */
export const applyThemesOnElement = (
  element,
  themes: HomeAssistant["themes"],
  selectedTheme?: string,
  themeSettings?: Partial<HomeAssistant["selectedThemeSettings"]>
) => {
  let cacheKey = selectedTheme;
  let themeRules: Partial<ThemeVars> = {};

  if (themeSettings) {
    // Determine the primary and accent colors. Fallbacks are the HA default blue and orange
    // or the derived "darkStyles" values, depending on the light vs dark mode.
    let primaryColor;
    let accentColor;
    if (selectedTheme === "default") {
      // User selected colors
      primaryColor = themeSettings.primaryColor || DEFAULT_PRIMARY_COLOR;
      accentColor = themeSettings.accentColor || DEFAULT_ACCENT_COLOR;
    } else if (selectedTheme && themes.themes[selectedTheme]) {
      // Try in that order:
      // 1. Fixed values from theme styles
      // 2. HA default colors
      if (themeSettings.dark) {
        primaryColor =
          themes.themes[selectedTheme].styles?.dark!["primary-color"] ||
          darkStyles["primary-color"] ||
          DEFAULT_PRIMARY_COLOR;
        accentColor =
          themes.themes[selectedTheme].styles?.dark!["accent-color"] ||
          darkStyles["accent-color"] ||
          DEFAULT_ACCENT_COLOR;
      } else {
        // eslint-disable-next-line no-lonely-if
        primaryColor =
          themes.themes[selectedTheme].styles?.light!["primary-color"] ||
          DEFAULT_PRIMARY_COLOR;
        accentColor =
          themes.themes[selectedTheme].styles?.light!["accent-color"] ||
          DEFAULT_ACCENT_COLOR;
      }
    }

    if (themeSettings.dark) {
      cacheKey = `${cacheKey}__dark`;
      themeRules = darkStyles;

      themeRules["app-header-background-color"] = hexBlend(
        primaryColor,
        "#121212",
        8
      );
    }

    if (primaryColor) {
      cacheKey = `${cacheKey}__primary_${primaryColor}`;
      const rgbPrimaryColor = hex2rgb(primaryColor);
      const labPrimaryColor = rgb2lab(rgbPrimaryColor);
      themeRules["primary-color"] = primaryColor;
      const rgbLightPrimaryColor = lab2rgb(labBrighten(labPrimaryColor));
      themeRules["light-primary-color"] = rgb2hex(rgbLightPrimaryColor);
      themeRules["dark-primary-color"] = lab2hex(labDarken(labPrimaryColor));
      themeRules["text-primary-color"] =
        rgbContrast(rgbPrimaryColor, [33, 33, 33]) < 7 ? "#fff" : "#212121";
      themeRules["text-light-primary-color"] =
        rgbContrast(rgbLightPrimaryColor, [33, 33, 33]) < 6
          ? "#fff"
          : "#212121";
      themeRules["state-icon-color"] = themeRules["dark-primary-color"];
    }
    if (accentColor) {
      cacheKey = `${cacheKey}__accent_${accentColor}`;
      themeRules["accent-color"] = accentColor;
      const rgbAccentColor = hex2rgb(accentColor);
      themeRules["text-accent-color"] =
        rgbContrast(rgbAccentColor, [33, 33, 33]) < 7 ? "#fff" : "#212121";
    }
  }

  if (selectedTheme && themes.themes[selectedTheme]) {
    // If dark is requested, check if the theme actually provides dark styles to use
    if (themeSettings?.dark && themes.themes[selectedTheme].styles?.dark)
      themeRules = {
        ...themeRules,
        ...themes.themes[selectedTheme].styles?.dark,
      };
    else {
      // Check if the theme provides styles (= new theme scheme), otherwise fallback to old scheme
      const rules =
        themes.themes[selectedTheme].styles?.light ||
        themes.themes[selectedTheme];
      themeRules = { ...themeRules, ...rules };
    }
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
  theme: Partial<ThemeVars>
): ProcessedTheme | undefined => {
  if (!theme || !Object.keys(theme).length) {
    return undefined;
  }
  const combinedTheme: Partial<ThemeVars> = {
    ...derivedStyles,
    ...theme,
  };
  const styles = {};
  const keys = {};
  for (const key of Object.keys(combinedTheme)) {
    const prefixedKey = `--${key}`;
    const value = String(combinedTheme[key]);
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
