import type { Connection } from "home-assistant-js-websocket";
import { createCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import { debounce } from "../common/util/debounce";
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

/**
 * Fetch all lab features
 * @param hass - The Home Assistant instance
 * @returns A promise to fetch the lab features
 */
export const fetchLabFeatures = async (
  hass: HomeAssistant
): Promise<LabPreviewFeature[]> => {
  const response = await hass.callWS<LabPreviewFeaturesResponse>({
    type: "labs/list",
  });
  return response.features;
};

/**
 * Update a specific lab feature
 * @param hass - The Home Assistant instance
 * @param domain - The domain of the lab feature
 * @param preview_feature - The preview feature of the lab feature
 * @param enabled - Whether the lab feature is enabled
 * @param create_backup - Whether to create a backup of the lab feature
 * @returns A promise to update the lab feature
 */
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

const fetchLabFeaturesCollection = (conn: Connection) =>
  conn
    .sendMessagePromise<LabPreviewFeaturesResponse>({
      type: "labs/list",
    })
    .then((response) => response.features);

const subscribeLabUpdates = (
  conn: Connection,
  store: Store<LabPreviewFeature[]>
) =>
  conn.subscribeEvents(
    debounce(
      () =>
        fetchLabFeaturesCollection(conn).then((features: LabPreviewFeature[]) =>
          store.setState(features, true)
        ),
      500,
      true
    ),
    "labs_updated"
  );

/**
 * Subscribe to a collection of lab features
 * @param conn - The connection to the Home Assistant instance
 * @param onChange - The function to call when the lab features change
 * @returns The unsubscribe function
 */
export const subscribeLabFeatures = (
  conn: Connection,
  onChange: (features: LabPreviewFeature[]) => void
) =>
  createCollection<LabPreviewFeature[]>(
    "_labFeatures",
    fetchLabFeaturesCollection,
    subscribeLabUpdates,
    conn,
    onChange
  );

/**
 * Subscribe to a specific lab feature
 * @param conn - The connection to the Home Assistant instance
 * @param domain - The domain of the lab feature
 * @param previewFeature - The preview feature identifier
 * @param onChange - The function to call when the lab feature changes
 * @returns A promise that resolves to the unsubscribe function
 */
export const subscribeLabFeature = (
  conn: Connection,
  domain: string,
  previewFeature: string,
  onChange: (feature: LabPreviewFeature) => void
): Promise<() => void> =>
  conn.subscribeMessage<LabPreviewFeature>(onChange, {
    type: "labs/subscribe",
    domain,
    preview_feature: previewFeature,
  });
