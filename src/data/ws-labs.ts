import type { Connection } from "home-assistant-js-websocket";
import { createCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import { debounce } from "../common/util/debounce";
import type { LabPreviewFeature, LabPreviewFeaturesResponse } from "./labs";

const fetchLabFeatures = (conn: Connection) =>
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
        fetchLabFeatures(conn).then((features: LabPreviewFeature[]) =>
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
    fetchLabFeatures,
    subscribeLabUpdates,
    conn,
    onChange
  );
