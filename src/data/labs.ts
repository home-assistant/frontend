import type { HomeAssistant } from "../types";

export interface LabFeature {
  feature: string;
  domain: string;
  enabled: boolean;
  feedback_url?: string;
  learn_more_url?: string;
  report_issue_url?: string;
}

export interface LabFeaturesResponse {
  features: LabFeature[];
}

export const fetchLabFeatures = async (
  hass: HomeAssistant
): Promise<LabFeature[]> => {
  const response = await hass.callWS<LabFeaturesResponse>({
    type: "labs/list",
  });
  return response.features;
};

export const labsUpdateFeature = (
  hass: HomeAssistant,
  feature: string,
  enabled: boolean
): Promise<void> =>
  hass.callWS({
    type: "labs/update",
    feature_id: feature,
    enabled,
  });
