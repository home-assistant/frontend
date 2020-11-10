import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistant, PanelInfo, Panels } from "../types";

/** Panel to show when no panel is picked. */
export const DEFAULT_PANEL = "lovelace";

export const getStorageDefaultPanelUrlPath = (): string =>
  localStorage.defaultPanel
    ? JSON.parse(localStorage.defaultPanel)
    : DEFAULT_PANEL;

export const setDefaultPanel = (
  element: HTMLElement,
  urlPath: string
): void => {
  fireEvent(element, "hass-default-panel", { defaultPanel: urlPath });
};

export const getDefaultPanel = (hass: HomeAssistant): PanelInfo =>
  hass.panels[hass.defaultPanel]
    ? hass.panels[hass.defaultPanel]
    : hass.panels[DEFAULT_PANEL];

const getPanelNameTranslationKey = (
  panelName: string | null
): string | undefined => {
  if (!panelName) {
    return undefined;
  }

  if (panelName === "lovelace") {
    return "panel.states";
  }

  if (panelName === "profile") {
    return "panel.profile";
  }

  return `panel.${panelName}`;
};

export const getPanelTitle = (hass: HomeAssistant): string | undefined => {
  if (!hass.panels) {
    return undefined;
  }

  const panel = Object.values(hass.panels).find(
    (p: PanelInfo): boolean => p.url_path === hass.panelUrl
  );

  if (!panel) {
    return undefined;
  }

  const translationKey = getPanelNameTranslationKey(panel?.url_path);

  return (
    (translationKey && hass.localize(translationKey)) ||
    panel.title ||
    undefined
  );
};

export const getPanelText = (panel: Panels["panel"]) => {
  if (!panel) {
    return undefined;
  }

  const panelNameTranslationKey =
    getPanelNameTranslationKey(panel.title) ||
    getPanelNameTranslationKey(panel.component_name);

  if (!panelNameTranslationKey) {
    return undefined;
  }

  return panelNameTranslationKey;
};

export const getPanelIcon = (panel: Panels["panel"]): string | null => {
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
