import type { Connection } from "home-assistant-js-websocket";
import { createCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import { debounce } from "../common/util/debounce";
import type { FloorRegistryEntry } from "./floor_registry";

const fetchFloorRegistry = (conn: Connection) =>
  conn.sendMessagePromise<FloorRegistryEntry[]>({
    type: "config/floor_registry/list",
  });

const subscribeFloorRegistryUpdates = (
  conn: Connection,
  store: Store<FloorRegistryEntry[]>
) =>
  conn.subscribeEvents(
    debounce(
      () =>
        fetchFloorRegistry(conn).then((areas: FloorRegistryEntry[]) =>
          store.setState(areas, true)
        ),
      500,
      true
    ),
    "floor_registry_updated"
  );

export const subscribeFloorRegistry = (
  conn: Connection,
  onChange: (floors: FloorRegistryEntry[]) => void
) =>
  createCollection<FloorRegistryEntry[]>(
    "_floorRegistry",
    fetchFloorRegistry,
    subscribeFloorRegistryUpdates,
    conn,
    onChange
  );
