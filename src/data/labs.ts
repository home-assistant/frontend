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
