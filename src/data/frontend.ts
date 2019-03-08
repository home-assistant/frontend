import { HomeAssistant } from "../types";

export interface FrontendUserData {
  language: string;
}

export const fetchFrontendUserData = async (
  hass: HomeAssistant,
  key: string
): Promise<FrontendUserData> => {
  const result = await hass.callWS<{ value: FrontendUserData }>({
    type: "frontend/get_user_data",
    key,
  });
  return result.value;
};

export const saveFrontendUserData = async (
  hass: HomeAssistant,
  key: string,
  value: FrontendUserData
): Promise<void> =>
  hass.callWS<void>({
    type: "frontend/set_user_data",
    key,
    value,
  });

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
