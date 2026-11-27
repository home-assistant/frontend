import type { HomeAssistant } from "../types";

export interface AnalyticsPreferences {
  base?: boolean;
  diagnostics?: boolean;
  usage?: boolean;
  statistics?: boolean;
  snapshots?: boolean;
}

export interface Analytics {
  preferences: AnalyticsPreferences;
  onboarded: boolean;
}

export interface AnalyticsPreview {
  /** The payload sent to Home Assistant analytics, null when nothing is sent. */
  analytics: Record<string, unknown> | null;
  /** The payload sent to the device database, null when nothing is sent. */
  snapshot: Record<string, unknown> | null;
}

export const getAnalyticsDetails = (hass: HomeAssistant) =>
  hass.callWS<Analytics>({
    type: "analytics",
  });

export const setAnalyticsPreferences = (
  hass: HomeAssistant,
  preferences: AnalyticsPreferences
) =>
  hass.callWS<{ preferences: AnalyticsPreferences }>({
    type: "analytics/preferences",
    preferences,
  });

export const fetchAnalyticsPreview = (callWS: HomeAssistant["callWS"]) =>
  callWS<AnalyticsPreview>({
    type: "analytics/preview",
  });
