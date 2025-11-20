import type { HomeAssistant } from "../types";

export interface LabPreviewFeature {
  preview_feature: string;
  domain: string;
  enabled: boolean;
  is_built_in: boolean;
  feedback_url?: string;
  learn_more_url?: string;
  report_issue_url?: string;
}

export interface LabPreviewFeaturesResponse {
  features: LabPreviewFeature[];
}

export const fetchLabFeatures = async (
  hass: HomeAssistant
): Promise<LabPreviewFeature[]> => {
  const response = await hass.callWS<LabPreviewFeaturesResponse>({
    type: "labs/list",
  });
  return response.features;
};

export const labsUpdatePreviewFeature = (
  hass: HomeAssistant,
  domain: string,
  preview_feature: string,
  enabled: boolean,
  create_backup?: boolean
): Promise<void> =>
  hass.callWS({
    type: "labs/update",
    domain,
    preview_feature,
    enabled,
    ...(create_backup !== undefined && { create_backup }),
  });
