import { atLeastVersion } from "../../common/config/version";
import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

export interface HassioResolution {
  unsupported: string[];
  unhealthy: string[];
  issues: string[];
  suggestions: string[];
}

export const fetchHassioResolution = async (
  hass: HomeAssistant
): Promise<HassioResolution> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return hass.callWS({
      type: "supervisor/api",
      endpoint: "/resolution/info",
      method: "get",
    });
  }

  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioResolution>>(
      "GET",
      "hassio/resolution/info"
    )
  );
};
