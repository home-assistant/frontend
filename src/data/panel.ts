import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistant, PanelInfo } from "../types";

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
