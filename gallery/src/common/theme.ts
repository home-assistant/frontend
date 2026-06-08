import { applyThemesOnElement } from "../../../src/common/dom/apply_themes_on_element";
import { themeStyles } from "../../../src/resources/theme/theme";
import type { HomeAssistant, ThemeSettings } from "../../../src/types";

export const GALLERY_THEME_STORAGE_KEY = "gallery-theme";

export const loadGalleryThemeSettings = (): ThemeSettings => {
  const stored = localStorage.getItem(GALLERY_THEME_STORAGE_KEY);
  if (!stored) {
    return { theme: "default" };
  }

  try {
    const value = JSON.parse(stored) as Partial<ThemeSettings>;
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

const LIGHT_THEME_VARIABLES = themeStyles
  .split(";")
  .reduce<Record<string, string>>((variables, rawLine) => {
    const variableStart = rawLine.indexOf("--");
    if (variableStart === -1) {
      return variables;
    }

    const line = rawLine.substring(variableStart).replaceAll("}", "").trim();
    const separator = line.indexOf(":");
    if (separator === -1) {
      return variables;
    }

    variables[line.substring(0, separator)] = line
      .substring(separator + 1)
      .trim();
    return variables;
  }, {});

const LIGHT_THEME_VARIABLE_KEYS = Object.keys(LIGHT_THEME_VARIABLES);

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
    return;
  }

  for (const key of LIGHT_THEME_VARIABLE_KEYS) {
    element.style.removeProperty(key);
  }
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
