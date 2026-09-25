import type { Connection } from "home-assistant-js-websocket";
import { createCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import { debounce } from "../common/util/debounce";
import type { EntityRegistryDisplayEntryResponse } from "./entity/entity_registry";
import { fetchEntityRegistryDisplay } from "./entity/entity_registry";

const subscribeEntityRegistryDisplayUpdates = (
  conn: Connection,
  store: Store<EntityRegistryDisplayEntryResponse>
) =>
  conn.subscribeEvents(
    debounce(
      () =>
        fetchEntityRegistryDisplay(conn).then((entities) =>
          store.setState(entities, true)
        ),
      500,
      true
    ),
    "entity_registry_updated"
  );

export const subscribeEntityRegistryDisplay = (
  conn: Connection,
  onChange: (entities: EntityRegistryDisplayEntryResponse) => void
) =>
  createCollection<EntityRegistryDisplayEntryResponse>(
    "_entityRegistryDisplay",
    fetchEntityRegistryDisplay,
    subscribeEntityRegistryDisplayUpdates,
    conn,
    onChange
  );
