import { HomeAssistant } from "../types";

export interface Analytics {
  preferences: string[];
  huuid: string;
}

export const getAnalyticsDetails = (hass: HomeAssistant) =>
  hass.callWS<Analytics>({
    type: "analytics",
  });

export const setAnalyticsPrefrences = (
  hass: HomeAssistant,
  preferences: Analytics["preferences"]
) =>
  hass.callWS<Analytics["preferences"]>({
    type: "analytics/preferences",
    preferences,
  });
