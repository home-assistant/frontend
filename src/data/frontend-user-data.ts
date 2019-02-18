import { HomeAssistant } from "../types";

/**
 * all frontend component storage data associated with current user
 */
export const fetchAllFrontendUserData = async (
  hass: HomeAssistant
): Promise<any> => {
  const result = await hass.callWS<{ value: any }>({
    type: "frontend/get_user_data",
  });
  return result.value;
};

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
