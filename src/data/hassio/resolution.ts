import { atLeastVersion } from "../../common/config/version";
import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

export interface HassioResolution {
  unsupported: string[];
  unhealthy: string[];
  issues: string[];
  suggestions: string[];
  checks: { name: string; enabled: boolean }[];
}

export const fetchHassioResolution = async (
  hass: HomeAssistant
): Promise<HassioResolution> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return await hass.callWS({
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

export const setCheckOption = async (
  hass: HomeAssistant,
  check: string,
  data: Record<string, any>
): Promise<void> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: `/resolution/check/${check}`,
      data,
      method: "post",
    });
    return;
  }

  await hass.callApi<HassioResponse<HassioResolution>>(
    "POST",
    `hassio/resolution/check/${check}`,
    data
  );
};
