import type { HomeAssistant, PanelInfo } from "../types";

/** Panel to show when no panel is picked. */
export const DEFAULT_PANEL = "lovelace";

export const getStorageDefaultPanelUrlPath = (): string => {
  const defaultPanel = window.localStorage.getItem("defaultPanel");

  return defaultPanel ? JSON.parse(defaultPanel) : DEFAULT_PANEL;
};

export const getDefaultPanel = (hass: HomeAssistant): PanelInfo =>
  hass.panels[hass.sidebar.defaultPanel]
    ? hass.panels[hass.sidebar.defaultPanel]
    : hass.panels[DEFAULT_PANEL];

export const getPanelNameTranslationKey = (panel: PanelInfo) => {
  if (panel.url_path === "lovelace") {
    return "panel.states" as const;
  }

  if (panel.url_path === "profile") {
    return "panel.profile" as const;
  }

  return `panel.${panel.title}` as const;
};

export const getPanelTitle = (
  hass: HomeAssistant,
  panel: PanelInfo
): string | undefined => {
  const translationKey = getPanelNameTranslationKey(panel);

  return hass.localize(translationKey) || panel.title || undefined;
};

export const getPanelTitleFromUrlPath = (
  hass: HomeAssistant,
  urlPath: string
): string | undefined => {
  if (!hass.panels) {
    return undefined;
  }

  const panel = Object.values(hass.panels).find(
    (p: PanelInfo): boolean => p.url_path === urlPath
  );

  if (!panel) {
    return undefined;
  }

  return getPanelTitle(hass, panel);
};

export const getPanelIcon = (panel: PanelInfo): string | null => {
  if (!panel.icon) {
    switch (panel.component_name) {
      case "profile":
        return "hass:account";
      case "lovelace":
        return "hass:view-dashboard";
    }
  }

  return panel.icon;
};
