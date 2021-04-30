import { HomeAssistant } from "../types";
import { fetchFrontendUserData, saveFrontendUserData } from "./frontend";

export enum NumberFormat {
  language = "language",
  system = "system",
  comma_decimal = "comma_decimal",
  decimal_comma = "decimal_comma",
  space_comma = "space_comma",
  none = "none",
}

export interface FrontendTranslationData {
  language: string;
  number_format: NumberFormat;
}

declare global {
  interface FrontendUserData {
    language: FrontendTranslationData;
  }
}

export type TranslationCategory =
  | "title"
  | "state"
  | "config"
  | "config_panel"
  | "options"
  | "device_automation"
  | "mfa_setup"
  | "system_health";

export const fetchTranslationPreferences = (hass: HomeAssistant) =>
  fetchFrontendUserData(hass.connection, "language");

export const saveTranslationPreferences = (
  hass: HomeAssistant,
  data: FrontendTranslationData
) => saveFrontendUserData(hass.connection, "language", data);

export const getHassTranslations = async (
  hass: HomeAssistant,
  language: string,
  category: TranslationCategory,
  integration?: string,
  config_flow?: boolean
): Promise<Record<string, unknown>> => {
  const result = await hass.callWS<{ resources: Record<string, unknown> }>({
    type: "frontend/get_translations",
    language,
    category,
    integration,
    config_flow,
  });
  return result.resources;
};

export const getHassTranslationsPre109 = async (
  hass: HomeAssistant,
  language: string
): Promise<Record<string, unknown>> => {
  const result = await hass.callWS<{ resources: Record<string, unknown> }>({
    type: "frontend/get_translations",
    language,
  });
  return result.resources;
};
