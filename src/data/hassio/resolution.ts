import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

export interface HassioResolution {
  unsupported: string[];
  unhealthy: string[];
  issues: string[];
  suggestions: string[];
}

export const fetchHassioResolution = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioResolution>>(
      "GET",
      "hassio/resolution/info"
    )
  );
};
