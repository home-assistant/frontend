import { applyThemesOnElement } from "../../../src/common/dom/apply_themes_on_element";
import { extractVars } from "../../../src/common/style/derived-css-vars";
import { animationStyles } from "../../../src/resources/theme/animations.globals";
import { coreStyles } from "../../../src/resources/theme/core.globals";
import { colorStyles } from "../../../src/resources/theme/color/color.globals";
import { coreColorStyles } from "../../../src/resources/theme/color/core.globals";
import { semanticColorStyles } from "../../../src/resources/theme/color/semantic.globals";
import { waColorStyles } from "../../../src/resources/theme/color/wa.globals";
import { mainStyles } from "../../../src/resources/theme/main.globals";
import { semanticStyles } from "../../../src/resources/theme/semantic.globals";
import { typographyStyles } from "../../../src/resources/theme/typography.globals";
import { waMainStyles } from "../../../src/resources/theme/wa.globals";
import type { HomeAssistant, ThemeSettings } from "../../../src/types";

export const GALLERY_THEME_STORAGE_KEY = "gallery-theme";

export const loadGalleryThemeSettings = (): ThemeSettings => {
  const stored = localStorage.getItem(GALLERY_THEME_STORAGE_KEY);
  if (!stored) {
    return { theme: "default" };
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    const value =
      parsed && typeof parsed === "object"
        ? (parsed as Partial<ThemeSettings>)
        : {};
    return {
      theme: "default",
      dark: typeof value.dark === "boolean" ? value.dark : undefined,
      primaryColor:
        typeof value.primaryColor === "string" ? value.primaryColor : undefined,
      accentColor:
        typeof value.accentColor === "string" ? value.accentColor : undefined,
    };
  } catch (_err) {
    return { theme: "default" };
  }
};

const LIGHT_THEME_STYLES = [
  coreStyles,
  mainStyles,
  typographyStyles,
  semanticStyles,
  coreColorStyles,
  semanticColorStyles,
  colorStyles,
  waColorStyles,
  waMainStyles,
  animationStyles,
];

const LIGHT_THEME_VARIABLES = LIGHT_THEME_STYLES.reduce<Record<string, string>>(
  (variables, style) => {
    for (const [key, value] of Object.entries(extractVars(style))) {
      variables[`--${key}`] = value;
    }
    return variables;
  },
  {}
);

const LIGHT_THEME_VARIABLE_KEYS = Object.keys(LIGHT_THEME_VARIABLES);
const LIGHT_THEME_DEFAULTS_APPLIED = new WeakSet<HTMLElement>();

export const effectiveGalleryDarkMode = (
  themeSettings: ThemeSettings,
  systemDark: boolean
): boolean => themeSettings.dark ?? systemDark;

const galleryThemes = (darkMode: boolean): HomeAssistant["themes"] => ({
  default_theme: "default",
  default_dark_theme: null,
  themes: {},
  darkMode,
  theme: "default",
});

const applyLightThemeDefaults = (element: HTMLElement, lightMode: boolean) => {
  if (lightMode) {
    for (const [key, value] of Object.entries(LIGHT_THEME_VARIABLES)) {
      element.style.setProperty(key, value);
    }
    LIGHT_THEME_DEFAULTS_APPLIED.add(element);
    return;
  }

  if (!LIGHT_THEME_DEFAULTS_APPLIED.has(element)) {
    return;
  }

  for (const key of LIGHT_THEME_VARIABLE_KEYS) {
    element.style.removeProperty(key);
  }
  LIGHT_THEME_DEFAULTS_APPLIED.delete(element);
};

export const applyFlippedGalleryTheme = (
  element: HTMLElement,
  themeSettings: ThemeSettings,
  systemDark: boolean
) => {
  const darkMode = !effectiveGalleryDarkMode(themeSettings, systemDark);

  if (!darkMode) {
    applyThemesOnElement(element, galleryThemes(false), undefined, {
      dark: false,
    });
    applyLightThemeDefaults(element, true);
  } else {
    applyLightThemeDefaults(element, false);
  }

  applyThemesOnElement(element, galleryThemes(darkMode), "default", {
    ...themeSettings,
    dark: darkMode,
  });
  element.style.colorScheme = darkMode ? "dark" : "light";
};
