import type { HomeAssistant } from "../types";

export interface CommonControlResult {
  entities: string[];
}

export const getCommonControl = (hass: HomeAssistant) =>
  hass.callWS<CommonControlResult>({
    type: "usage_prediction/common_control",
  });
