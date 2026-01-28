import {
  mdiAccount,
  mdiCalendar,
  mdiChartBox,
  mdiClipboardList,
  mdiFormatListBulletedType,
  mdiLightningBolt,
  mdiPlayBoxMultiple,
  mdiTooltipAccount,
} from "@mdi/js";
import type { HomeAssistant, PanelInfo } from "../types";
import type { PageNavigation } from "../layouts/hass-tabs-subpage";
import type { LocalizeKeys } from "../common/translations/localize";

/** Panel to show when no panel is picked. */
export const DEFAULT_PANEL = "home";

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

/**
 * Get subpage title for config panel routes.
 * Returns the specific subpage title (e.g., "Automations") if found,
 * or undefined to fall back to the panel title (e.g., "Settings").
 *
 * @param hass HomeAssistant instance
 * @param path Full route path (e.g., "/config/automation/dashboard")
 * @param configSections Config sections metadata for resolving subpage titles
 * @returns Localized subpage title, or undefined if not found
 */
export const getConfigSubpageTitle = (
  hass: HomeAssistant,
  path: string,
  configSections: Record<string, PageNavigation[]>
): string | undefined => {
  // Search through all config section groups for a matching path
  for (const sectionGroup of Object.values(configSections)) {
    const pageNav = sectionGroup.find((nav) => path.startsWith(nav.path));
    if (pageNav) {
      if (pageNav.translationKey) {
        const localized = hass.localize(pageNav.translationKey as LocalizeKeys);
        if (localized) {
          return localized;
        }
      }

      if (pageNav.name) {
        return pageNav.name;
      }
    }
  }
  return undefined;
};

export const getPanelIcon = (panel: PanelInfo): string | undefined => {
  if (!panel.icon) {
    switch (panel.component_name) {
      case "profile":
        return "mdi:account";
    }
  }

  return panel.icon || undefined;
};

export const PANEL_ICON_PATHS = {
  calendar: mdiCalendar,
  energy: mdiLightningBolt,
  history: mdiChartBox,
  logbook: mdiFormatListBulletedType,
  map: mdiTooltipAccount,
  profile: mdiAccount,
  "media-browser": mdiPlayBoxMultiple,
  todo: mdiClipboardList,
};

export const getPanelIconPath = (panel: PanelInfo): string | undefined =>
  PANEL_ICON_PATHS[panel.url_path];

export const FIXED_PANELS = ["profile", "config"];
