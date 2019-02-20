import { HomeAssistant } from "../types";

export const fetchFrontendUserData = async (
  hass: HomeAssistant,
  key: string
): Promise<any> => {
  const result = await hass.callWS<{ value: any }>({
    type: "frontend/get_user_data",
    key,
  });
  return result.value;
};

export const saveFrontendUserData = async (
  hass: HomeAssistant,
  key: string,
  value: any
): Promise<void> =>
  hass.callWS<void>({
    type: "frontend/set_user_data",
    key,
    value,
  });

export const getTranslations = async (
  hass: HomeAssistant,
  language: string
): Promise<{}> => {
  const result = await hass.callWS<{ resources: {} }>({
    type: "frontend/get_translations",
    language,
  });
  return result.resources;
};
