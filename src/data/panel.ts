import {
  mdiAccount,
  mdiCalendar,
  mdiChartBox,
  mdiClipboardList,
  mdiFormatListBulletedType,
  mdiHammer,
  mdiLightningBolt,
  mdiPlayBoxMultiple,
  mdiTooltipAccount,
  mdiViewDashboard,
} from "@mdi/js";
import type { HomeAssistant, PanelInfo } from "../types";

/** Panel to show when no panel is picked. */
export const DEFAULT_PANEL = "lovelace";

export const getLegacyDefaultPanelUrlPath = (): string | null => {
  const defaultPanel = window.localStorage.getItem("defaultPanel");
  return defaultPanel ? JSON.parse(defaultPanel) : null;
};

export const getDefaultPanelUrlPath = (hass: HomeAssistant): string =>
  hass.userData?.default_panel ||
  hass.systemData?.default_panel ||
  getLegacyDefaultPanelUrlPath() ||
  DEFAULT_PANEL;

export const getDefaultPanel = (hass: HomeAssistant): PanelInfo => {
  const panel = getDefaultPanelUrlPath(hass);

  return (panel ? hass.panels[panel] : undefined) ?? hass.panels[DEFAULT_PANEL];
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

export const getPanelIcon = (panel: PanelInfo): string | undefined => {
  if (!panel.icon) {
    switch (panel.component_name) {
      case "profile":
        return "mdi:account";
      case "lovelace":
        return "mdi:view-dashboard";
    }
  }

  return panel.icon || undefined;
};

export const PANEL_ICON_PATHS = {
  calendar: mdiCalendar,
  "developer-tools": mdiHammer,
  energy: mdiLightningBolt,
  history: mdiChartBox,
  logbook: mdiFormatListBulletedType,
  lovelace: mdiViewDashboard,
  profile: mdiAccount,
  map: mdiTooltipAccount,
  "media-browser": mdiPlayBoxMultiple,
  todo: mdiClipboardList,
};

export const getPanelIconPath = (panel: PanelInfo): string | undefined =>
  PANEL_ICON_PATHS[panel.url_path];

export const FIXED_PANELS = ["profile", "config"];
export const SHOW_AFTER_SPACER_PANELS = ["developer-tools"];
