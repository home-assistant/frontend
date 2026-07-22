import type { HomeAssistant, TranslationDict } from "../../types";

export interface HassioResolution {
  unsupported: (keyof TranslationDict["ui"]["dialogs"]["unsupported"]["reasons"])[];
  unhealthy: (keyof TranslationDict["ui"]["dialogs"]["unhealthy"]["reasons"])[];
  issues: string[];
  suggestions: string[];
}

export const fetchHassioResolution = async (
  hass: HomeAssistant
): Promise<HassioResolution> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: "/resolution/info",
    method: "get",
  });
