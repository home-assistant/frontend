import { Connection, createCollection } from "home-assistant-js-websocket";
import { Store } from "home-assistant-js-websocket/dist/store";
import { stringCompare } from "../common/string/compare";
import { debounce } from "../common/util/debounce";
import { AreaRegistryEntry } from "./area_registry";

const fetchAreaRegistry = (conn: Connection) =>
  conn
    .sendMessagePromise<AreaRegistryEntry[]>({
      type: "config/area_registry/list",
    })
    .then((areas) =>
      areas.sort((ent1, ent2) => stringCompare(ent1.name, ent2.name))
    );

const subscribeAreaRegistryUpdates = (
  conn: Connection,
  store: Store<AreaRegistryEntry[]>
) =>
  conn.subscribeEvents(
    debounce(
      () =>
        fetchAreaRegistry(conn).then((areas: AreaRegistryEntry[]) =>
          store.setState(areas, true)
        ),
      500,
      true
    ),
    "area_registry_updated"
  );

export const subscribeAreaRegistry = (
  conn: Connection,
  onChange: (areas: AreaRegistryEntry[]) => void
) =>
  createCollection<AreaRegistryEntry[]>(
    "_areaRegistry",
    fetchAreaRegistry,
    subscribeAreaRegistryUpdates,
    conn,
    onChange
  );
