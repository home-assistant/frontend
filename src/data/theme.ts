import type { HomeAssistant, ThemeSettings } from "../types";
import { saveFrontendUserData, subscribeFrontendUserData } from "./frontend";

declare global {
  interface FrontendUserData {
    theme: ThemeSettings;
  }
}

export const subscribeThemePreferences = (
  hass: HomeAssistant,
  callback: (data: { value: ThemeSettings | null }) => void
) => subscribeFrontendUserData(hass.connection, "theme", callback);

export const saveThemePreferences = (
  hass: HomeAssistant,
  data: ThemeSettings
) => saveFrontendUserData(hass.connection, "theme", data);
