import { HomeAssistant } from "../types";

export interface Analytics {
  preferences: string[];
  huuid: string;
}

export const getAnalyticsDetails = (hass: HomeAssistant) =>
  hass.callWS<Analytics>({
    type: "analytics",
  });

export const setAnalyticsPreferences = (
  hass: HomeAssistant,
  preferences: Analytics["preferences"]
) =>
  hass.callWS<void>({
    type: "analytics/preferences",
    preferences,
  });
