import type { HomeAssistant } from "../types";

export interface PageNavigation {
  path: string;
  translationKey?: string;
  component?: string | string[];
  name?: string;
  core?: boolean;
  /** Hide from non-admin users in filtered navigation and quick bar. */
  adminOnly?: boolean;
  iconPath?: string;
  iconSecondaryPath?: string;
  iconViewBox?: string;
  description?: string;
  iconColor?: string;
  // Shown next to the name of the tab
  badge?: string;
  info?: any;
  filter?: (hass: Pick<HomeAssistant, "entities">) => boolean;
}
