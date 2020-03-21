import { HomeAssistant, PanelInfo } from "../types";

/** Panel to show when no panel is picked. */
const DEFAULT_PANEL = "lovelace";

export const getDefaultPanelUrlPath = () =>
  localStorage.defaultPage || DEFAULT_PANEL;

export const getDefaultPanel = (panels: HomeAssistant["panels"]) =>
  panels[localStorage.defaultPage] || panels[DEFAULT_PANEL];

export const getPanelTitle = (hass: HomeAssistant): string | null => {
  if (!hass.panels) {
    return null;
  }

  const panel = Object.values(hass.panels).find(
    (p: PanelInfo): boolean => p.url_path === hass.panelUrl
  );

  if (!panel) {
    return null;
  }

  if (panel.url_path === "lovelace") {
    return hass.localize("panel.states");
  }

  if (panel.url_path === "profile") {
    return hass.localize("panel.profile");
  }

  return hass.localize(`panel.${panel.title}`) || panel.title;
};
