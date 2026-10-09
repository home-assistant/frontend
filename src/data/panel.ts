import {
  mdiAccount,
  mdiCalendar,
  mdiChartBox,
  mdiClipboardList,
  mdiFormatListBulletedType,
  mdiLightningBolt,
  mdiMap,
  mdiPlayBoxMultiple,
} from "@mdi/js";
import type { LocalizeKeys } from "../common/translations/localize";
import type { PageNavigation } from "../layouts/hass-tabs-subpage";
import type { HomeAssistant, PanelInfo } from "../types";

export const APP_PANEL = "app";
export const HOME_PANEL = "home";
export const MY_REDIRECT_PANEL = "_my_redirect";
export const NOT_FOUND_PANEL = "notfound";
export const PROFILE_PANEL = "profile";
export const LOVELACE_PANEL = "lovelace";

/** Panels that are internal/system-level and should not appear in user-facing navigation UIs. */
export const SYSTEM_PANELS = [MY_REDIRECT_PANEL, NOT_FOUND_PANEL, APP_PANEL];

/** Panel to show when no panel is picked. */
export const DEFAULT_PANEL = HOME_PANEL;

export const hasLegacyOverviewPanel = (hass: HomeAssistant): boolean =>
  Boolean(hass.panels.lovelace?.config);

export const getLegacyDefaultPanelUrlPath = (): string | null => {
  const defaultPanel = window.localStorage.getItem("defaultPanel");
  return defaultPanel ? JSON.parse(defaultPanel) : null;
};

export const getDefaultPanelUrlPath = (hass: HomeAssistant): string => {
  const defaultPanel =
    hass.userData?.default_panel ||
    hass.systemData?.default_panel ||
    getLegacyDefaultPanelUrlPath() ||
    DEFAULT_PANEL;
  // If default panel is lovelace and no old overview exists, fall back to home
  if (defaultPanel === LOVELACE_PANEL && !hasLegacyOverviewPanel(hass)) {
    return DEFAULT_PANEL;
  }
  return defaultPanel;
};

export const getDefaultPanel = (hass: HomeAssistant): PanelInfo => {
  const panel = getDefaultPanelUrlPath(hass);

  return (
    (panel ? hass.panels[panel] : undefined) ??
    hass.panels[DEFAULT_PANEL] ??
    hass.panels[NOT_FOUND_PANEL]
  );
};

export const getPanelNameTranslationKey = (panel: PanelInfo) => {
  if ([PROFILE_PANEL, NOT_FOUND_PANEL].includes(panel.url_path)) {
    return `panel.${panel.url_path}` as const;
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
  const sections = Object.entries(configSections);

  // Prefer pages with a full translation key or a name. The dashboard
  // sections also list pages like /config/integrations under a broader title.
  for (const [, pages] of sections) {
    const pageNav = pages.find((nav) => path.startsWith(nav.path));
    if (!pageNav) {
      continue;
    }

    if (pageNav.translationKey?.includes(".")) {
      const localized = hass.localize(pageNav.translationKey as LocalizeKeys);
      if (localized) {
        return localized;
      }
    }

    if (pageNav.name) {
      return pageNav.name;
    }
  }

  // Some pages are only listed with a short translation key. Expand it the
  // same way their navigation does.
  for (const [section, pages] of sections) {
    const shortKey = pages.find((nav) =>
      path.startsWith(nav.path)
    )?.translationKey;
    if (!shortKey || shortKey.includes(".")) {
      continue;
    }

    const translationKey =
      section === "general"
        ? `ui.panel.config.${shortKey}.caption`
        : `ui.panel.config.dashboard.${shortKey}.main`;
    const localized = hass.localize(translationKey as LocalizeKeys);
    if (localized) {
      return localized;
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

// Built-in panels render their stock icon from a bundled path, so the sidebar
// does not wait for the icon set to load.
const BUILT_IN_PANEL_ICONS: Record<string, { icon?: string; path: string }> = {
  calendar: { icon: "mdi:calendar", path: mdiCalendar },
  energy: { icon: "mdi:lightning-bolt", path: mdiLightningBolt },
  history: { icon: "mdi:chart-box", path: mdiChartBox },
  logbook: {
    icon: "mdi:format-list-bulleted-type",
    path: mdiFormatListBulletedType,
  },
  map: { icon: "mdi:map", path: mdiMap },
  profile: { path: mdiAccount },
  "media-browser": { icon: "mdi:play-box-multiple", path: mdiPlayBoxMultiple },
  todo: { icon: "mdi:clipboard-list", path: mdiClipboardList },
};

export const getPanelIconPath = (panel: PanelInfo): string | undefined => {
  const builtIn = BUILT_IN_PANEL_ICONS[panel.url_path];
  if (!builtIn) {
    return undefined;
  }

  // An icon the user picked for the panel always wins.
  return !panel.icon || panel.icon === builtIn.icon ? builtIn.path : undefined;
};

export const FIXED_PANELS = [PROFILE_PANEL, "config", NOT_FOUND_PANEL];

export interface PanelMutableParams {
  title?: string | null;
  icon?: string | null;
  require_admin?: boolean | null;
  show_in_sidebar?: boolean | null;
}

export const updatePanel = (
  hass: HomeAssistant,
  urlPath: string,
  updates: PanelMutableParams
) =>
  hass.callWS({
    type: "frontend/update_panel",
    url_path: urlPath,
    ...updates,
  });
