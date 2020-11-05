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

  if (panel.url_path === "lovelace") {
    return hass.localize("panel.states");
  }

  if (panel.url_path === "profile") {
    return hass.localize("panel.profile");
  }

  return hass.localize(`panel.${panel.title}`) || panel.title || undefined;
};

export const getPanelText = (hass: HomeAssistant, panel: Panels["panel"]) => {
  let translationKey = "";

  if (!panel.title) {
    switch (panel.component_name) {
      case "profile":
        translationKey = "panel.profile";
        break;
      case "lovelace":
        translationKey = "panel.states";
        break;
    }
  } else {
    translationKey = `panel.${panel.title}`;
  }

  return hass.localize(
    "ui.dialogs.quick-bar.commands.navigation.navigate_to",
    "panel",
    hass.localize(translationKey)
  );
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
