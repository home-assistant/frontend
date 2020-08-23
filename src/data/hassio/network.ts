import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

export const fetchNetworkInfo = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<void>>("GET", "hassio/network/info")
  );
};
