import { formatHex } from "culori";
import type { ThemeVars } from "../../data/ws-themes";
import {
  getThemeVariables,
  themeDefinesColor,
  themeDefinesPrimaryPalette,
} from "../../data/ws-themes";
import { darkColorVariables } from "../../resources/theme/color";
import { darkSemanticVariables } from "../../resources/theme/semantic.globals";
import { derivedStyles } from "../../resources/theme/theme";
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
import { generateColorPalette, normalizeLuminance } from "../color/palette";
import { rgbContrast } from "../color/rgb";

interface ProcessedTheme {
  keys: Record<string, "">;
  styles: Record<string, string>;
}

let PROCESSED_THEMES: Record<string, ProcessedTheme> = {};

/**
 * Apply a theme to an element by setting the CSS variables on it.
 *
 * element: Element to apply theme on.
 * themes: HASS theme information (e.g. active dark mode and globally active theme name).
 * selectedTheme: Selected theme (used to override the globally active theme for this element).
 * themeSettings: Additional settings such as selected colors.
 */
export const applyThemesOnElement = (
  element,
  themes: HomeAssistant["themes"],
  selectedTheme?: string,
  themeSettings?: Partial<HomeAssistant["selectedTheme"]>,
  main?: boolean
) => {
  // If there is no explicitly desired theme provided, and the element is the main element we automatically
  // use the active one from `themes`.
  const themeToApply = selectedTheme || (main ? themes.theme : undefined);

  // If there is no explicitly desired dark mode provided, we automatically
  // use the active one from `themes`.
  const darkMode =
    themeSettings?.dark !== undefined
      ? themeSettings.dark
      : themes?.darkMode || false;

  let cacheKey = themeToApply;
  let themeRules: Partial<ThemeVars> = {};

  if (themeToApply && darkMode) {
    cacheKey = `${cacheKey}__dark`;
    themeRules = { ...darkSemanticVariables, ...darkColorVariables };
  }

  const isDefaultTheme = themeToApply === "default";
  const customTheme =
    themeToApply && !isDefaultTheme ? themes.themes[themeToApply] : undefined;
  const customThemeRules = customTheme
    ? getThemeVariables(customTheme, darkMode)
    : undefined;

  // Colors picked by the user apply to the default theme, and to custom
  // themes that don't set that color themselves.
  const primaryColor =
    isDefaultTheme ||
    (customThemeRules && !themeDefinesColor(customThemeRules, "primary"))
      ? themeSettings?.primaryColor
      : undefined;
  const accentColor =
    isDefaultTheme ||
    (customThemeRules && !themeDefinesColor(customThemeRules, "accent"))
      ? themeSettings?.accentColor
      : undefined;

  if (primaryColor) {
    cacheKey = `${cacheKey}__primary_${primaryColor}`;
  }
  if (accentColor) {
    cacheKey = `${cacheKey}__accent_${accentColor}`;
  }
  themeRules = {
    ...themeRules,
    ...getUserColorRules(primaryColor, accentColor, darkMode),
  };

  // Nothing was changed
  if (isDefaultTheme && element.__themes?.cacheKey === cacheKey) {
    return;
  }

  // A custom theme that sets a primary color but not the palette gets the
  // palette generated from that color, so components using the palette
  // follow the theme. Colors that can't be parsed, like `var(--x)`, are
  // left as they are.
  const themePrimaryColor =
    customThemeRules && !themeDefinesPrimaryPalette(customThemeRules)
      ? toHexColor(customThemeRules["primary-color"])
      : undefined;
  if (themePrimaryColor) {
    // Like colors picked by the user, keep the palette readable. Older themes
    // often set a near black primary color for the header, which would
    // otherwise give near black switches and buttons. The theme's own
    // primary-color is kept as it is.
    themeRules = {
      ...themeRules,
      ...getPrimaryPaletteRules(normalizeLuminance(themePrimaryColor)),
    };
  }

  // Custom theme variables go last, so they win over the defaults and over
  // anything derived from the colors picked by the user.
  if (customThemeRules) {
    themeRules = { ...themeRules, ...customThemeRules };
  }

  if (!element.__themes?.keys && !Object.keys(themeRules).length) {
    // No styles to reset, and no styles to set
    return;
  }

  const newTheme =
    Object.keys(themeRules).length && cacheKey
      ? PROCESSED_THEMES[cacheKey] || processTheme(cacheKey, themeRules)
      : undefined;

  // Add previous set keys to reset them, and new theme
  const styles = { ...element.__themes?.keys, ...newTheme?.styles };
  element.__themes = { cacheKey, keys: newTheme?.keys };

  // Set and/or reset styles
  for (const s in styles) {
    if (s === null) {
      element.style.removeProperty(s);
    } else {
      element.style.setProperty(s, styles[s]);
    }
  }
};

const toHexColor = (value: string | undefined): string | undefined =>
  value ? formatHex(value) : undefined;

/**
 * The generated primary palette and primary color shades for a hex color.
 * Used for colors picked by the user and for custom themes that set a primary
 * color without a palette.
 */
const getPrimaryPaletteRules = (primaryColor: string): Partial<ThemeVars> => {
  const rules: Partial<ThemeVars> = {};
  const labPrimaryColor = rgb2lab(hex2rgb(primaryColor));

  generateColorPalette(primaryColor, "primary").forEach(([key, color]) => {
    rules[key] = color;
  });

  rules["light-primary-color"] = rgb2hex(lab2rgb(labBrighten(labPrimaryColor)));
  rules["dark-primary-color"] = lab2hex(labDarken(labPrimaryColor));
  rules["darker-primary-color"] = lab2hex(labDarken(labPrimaryColor, 2));
  return rules;
};

/**
 * Derive the theme variables for the primary and accent colors picked by the
 * user, including the generated primary palette.
 */
const getUserColorRules = (
  primaryColor: string | undefined,
  accentColor: string | undefined,
  darkMode: boolean
): Partial<ThemeVars> => {
  const rules: Partial<ThemeVars> = {};

  if (primaryColor) {
    if (darkMode) {
      rules["app-header-background-color"] = hexBlend(
        primaryColor,
        "#121212",
        8
      );
    }

    Object.assign(rules, getPrimaryPaletteRules(primaryColor));
    rules["primary-color"] = primaryColor;
    rules["text-primary-color"] =
      rgbContrast(hex2rgb(primaryColor), [33, 33, 33]) < 6 ? "#fff" : "#212121";
    rules["text-light-primary-color"] =
      rgbContrast(hex2rgb(rules["light-primary-color"]!), [33, 33, 33]) < 6
        ? "#fff"
        : "#212121";
    rules["state-icon-color"] = rules["dark-primary-color"];
  }

  if (accentColor) {
    rules["accent-color"] = accentColor;
    const rgbAccentColor = hex2rgb(accentColor);
    rules["text-accent-color"] =
      rgbContrast(rgbAccentColor, [33, 33, 33]) < 6 ? "#fff" : "#212121";
  }

  return rules;
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
    } catch (_err: any) {
      continue;
    }
  }
  PROCESSED_THEMES[cacheKey] = { styles, keys };
  return { styles, keys };
};

export const invalidateThemeCache = () => {
  PROCESSED_THEMES = {};
};
