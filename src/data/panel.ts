import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant, PanelInfo } from "../types";

/** Panel to show when no panel is picked. */
export const DEFAULT_PANEL = "lovelace";

export const setDefaultBrowserPanel = (
  element: HTMLElement,
  urlPath: string
): void => {
  fireEvent(element, "hass-default-browser-panel", { defaultPanel: urlPath });
};

export const setDefaultUserPanel = (
  element: HTMLElement,
  urlPath: string | undefined
): void => {
  fireEvent(element, "hass-default-user-panel", { defaultPanel: urlPath });
};

export const getDefaultPanel = (hass: HomeAssistant): PanelInfo => {
  const preferred =
    hass.defaultBrowserPanel !== DEFAULT_PANEL
      ? hass.defaultBrowserPanel
      : hass.userData?.defaultPanel ?? DEFAULT_PANEL;
  return hass.panels[preferred] ?? hass.panels[DEFAULT_PANEL];
};

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
        return "mdi:account";
      case "lovelace":
        return "mdi:view-dashboard";
    }
  }

  return panel.icon;
};
