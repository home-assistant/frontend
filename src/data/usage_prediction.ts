import type { HomeAssistant } from "../types";

export interface CommonControlsResult {
  entities: string[];
}

export const getCommonControlsUsagePrediction = (hass: HomeAssistant) =>
  hass.callWS<CommonControlsResult>({
    type: "usage_prediction/common_control",
  });
