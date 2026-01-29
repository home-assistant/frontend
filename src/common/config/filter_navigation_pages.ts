import type { PageNavigation } from "../../layouts/hass-tabs-subpage";
import type { HomeAssistant } from "../../types";
import { canShowPage } from "./can_show_page";

export interface NavigationFilterOptions {
  /** Whether there are Bluetooth config entries (pre-fetched by caller) */
  hasBluetoothConfigEntries?: boolean;
}

/**
 * Filters navigation pages based on visibility rules.
 * Handles special cases like Bluetooth (requires config entries)
 * and external app configuration.
 */
export const filterNavigationPages = (
  hass: HomeAssistant,
  pages: PageNavigation[],
  options: NavigationFilterOptions = {}
): PageNavigation[] =>
  pages.filter((page) => {
    if (page.path === "#external-app-configuration") {
      return hass.auth.external?.config.hasSettingsScreen;
    }
    // Only show Bluetooth page if there are Bluetooth config entries
    if (page.component === "bluetooth") {
      return options.hasBluetoothConfigEntries ?? false;
    }
    return canShowPage(hass, page);
  });
