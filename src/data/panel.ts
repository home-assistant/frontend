import { HomeAssistant, PanelInfo } from "../types";
import { DEFAULT_PANEL } from "../common/const";

export const getPanelTitle = (hass: HomeAssistant): string | undefined => {
  let title: string = "";
  const panel = Object.values(hass.panels).find(
    (p: PanelInfo): boolean => p.url_path === hass.panelUrl
  );
  if (panel) {
    const defaultPanel =
      hass.panels[localStorage.defaultPage || DEFAULT_PANEL] ||
      hass.panels[DEFAULT_PANEL];
    title =
      panel.url_path === "profile"
        ? hass.localize("panel.profile")
        : hass.localize(`panel.${panel.title}`) ||
          panel.title ||
          defaultPanel.title ||
          hass.localize("panel.states");
  }
  return title;
};
