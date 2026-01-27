import { atLeastVersion } from "../../common/config/version";
import type { HomeAssistant, TranslationDict } from "../../types";
import type { HassioResponse } from "./common";
import { hassioApiResultExtractor } from "./common";

export interface HassioResolution {
  unsupported: (keyof TranslationDict["ui"]["dialogs"]["unsupported"]["reasons"])[];
  unhealthy: (keyof TranslationDict["ui"]["dialogs"]["unhealthy"]["reasons"])[];
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
