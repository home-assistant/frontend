import { HomeAssistant } from "../types";

export interface AnalyticsPreferences {
  base?: boolean;
  diagnostics?: boolean;
  usage?: boolean;
  statistics?: boolean;
}

export interface Analytics {
  preferences: AnalyticsPreferences;
}

export const getAnalyticsDetails = (hass: HomeAssistant) =>
  hass.callWS<Analytics>({
    type: "analytics",
  });

export const setAnalyticsPreferences = (
  hass: HomeAssistant,
  preferences: AnalyticsPreferences
) =>
  hass.callWS<AnalyticsPreferences>({
    type: "analytics/preferences",
    preferences,
  });
