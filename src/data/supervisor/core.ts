import { HomeAssistant } from "../../types";
import { HassioResponse } from "../hassio/common";

export const restartCore = async (hass: HomeAssistant) => {
  await hass.callApi<HassioResponse<void>>("POST", `hassio/core/restart`);
};

export const updateCore = async (hass: HomeAssistant) => {
  await hass.callApi<HassioResponse<void>>("POST", `hassio/core/update`);
};
