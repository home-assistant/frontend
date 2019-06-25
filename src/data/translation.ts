import { HomeAssistant } from "../types";
import { fetchFrontendUserData, saveFrontendUserData } from "./frontend";

export interface FrontendTranslationData {
  language: string;
}

declare global {
  interface FrontendUserData {
    language: FrontendTranslationData;
  }
}

export const fetchTranslationPreferences = (hass: HomeAssistant) =>
  fetchFrontendUserData(hass.connection, "language");

export const saveTranslationPreferences = (
  hass: HomeAssistant,
  data: FrontendTranslationData
) => saveFrontendUserData(hass.connection, "language", data);

export const getHassTranslations = async (
  hass: HomeAssistant,
  language: string
): Promise<{}> => {
  const result = await hass.callWS<{ resources: {} }>({
    type: "frontend/get_translations",
    language,
  });
  return result.resources;
};
