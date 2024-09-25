import { Connection, createCollection } from "home-assistant-js-websocket";
import { Store } from "home-assistant-js-websocket/dist/store";
import { stringCompare } from "../common/string/compare";
import { debounce } from "../common/util/debounce";
import { FloorRegistryEntry } from "./floor_registry";

const fetchFloorRegistry = (conn: Connection) =>
  conn
    .sendMessagePromise({
      type: "config/floor_registry/list",
    })
    .then((floors) =>
      (floors as FloorRegistryEntry[]).sort((ent1, ent2) => {
        if (ent1.level !== ent2.level) {
          return (ent1.level ?? 9999) - (ent2.level ?? 9999);
        }
        return stringCompare(ent1.name, ent2.name);
      })
    );

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
