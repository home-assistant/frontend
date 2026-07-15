import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import type { ThemeSettings } from "../../../src/types";

let sidebarChangeCallback: ((data: { value: unknown }) => void) | undefined;
let themeChangeCallback: ((data: { value: ThemeSettings }) => void) | undefined;

const THEME_STORAGE_KEY = "demo_theme";
const DEFAULT_THEME: ThemeSettings = { theme: "default", dark: false };

export const getDemoTheme = (
  fallback: ThemeSettings = DEFAULT_THEME
): ThemeSettings => {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (!storedTheme) {
    return fallback;
  }
  try {
    return JSON.parse(storedTheme) as ThemeSettings;
  } catch {
    localStorage.removeItem(THEME_STORAGE_KEY);
    return fallback;
  }
};

export const mockFrontend = (hass: MockHomeAssistant) => {
  hass.mockWS("frontend/get_user_data", ({ key }) => ({
    value: key === "theme" ? getDemoTheme() : null,
  }));
  hass.mockWS("frontend/set_user_data", ({ key, value }) => {
    if (key === "theme") {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(value));
      themeChangeCallback?.({ value });
      localStorage.removeItem("selectedTheme");
    }
    if (key === "sidebar") {
      sidebarChangeCallback?.({
        value: {
          panelOrder: value.panelOrder || [],
          hiddenPanels: value.hiddenPanels || [],
        },
      });
    }
  });
  hass.mockWS("frontend/subscribe_user_data", (msg, _hass, onChange) => {
    if (msg.key === "sidebar") {
      sidebarChangeCallback = onChange;
    }
    if (msg.key === "theme") {
      themeChangeCallback = onChange;
      onChange?.({ value: getDemoTheme() });
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }
    onChange?.({ value: null });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  });
  hass.mockWS(
    "frontend/subscribe_system_data",
    (_msg, currentHass, onChange) => {
      onChange?.({
        value: currentHass.systemData,
      });
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }
  );
  hass.mockWS("labs/subscribe", (_msg, _currentHass, onChange) => {
    onChange?.({
      preview_feature: _msg.preview_feature,
      domain: _msg.domain,
      enabled: false,
      is_built_in: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  });
  hass.mockWS("frontend/get_system_data", () => ({ value: null }));
  hass.mockWS("repairs/list_issues", () => ({ issues: [] }));
  hass.mockWS("frontend/get_themes", (_msg, currentHass) => currentHass.themes);
};
