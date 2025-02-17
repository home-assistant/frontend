import type { HomeAssistant } from "../types";
import {
  fetchFrontendUserData,
  saveFrontendUserData,
  subscribeFrontendUserData,
} from "./frontend";

export const SIDEBAR_PREFERENCES_KEY = "sidebar";

export interface SidebarPreferences {
  panelOrder?: string[];
  hiddenPanels?: string[];
}

declare global {
  interface FrontendUserData {
    sidebar?: SidebarPreferences;
  }
}

export const fetchSidebarPreferences = (hass: HomeAssistant) =>
  fetchFrontendUserData(hass.connection, SIDEBAR_PREFERENCES_KEY);

export const saveSidebarPreferences = (
  hass: HomeAssistant,
  data: SidebarPreferences
) => saveFrontendUserData(hass.connection, SIDEBAR_PREFERENCES_KEY, data);

export const subscribeSidebarPreferences = (
  hass: HomeAssistant,
  callback: (sidebar?: SidebarPreferences | null) => void
) =>
  subscribeFrontendUserData(hass.connection, SIDEBAR_PREFERENCES_KEY, callback);
