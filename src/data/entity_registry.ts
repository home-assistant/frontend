import { Connection, createCollection } from "home-assistant-js-websocket";
import { computeStateName } from "../common/entity/compute_state_name";
import { debounce } from "../common/util/debounce";
import { HomeAssistant } from "../types";

export interface EntityRegistryEntry {
  entity_id: string;
  name: string;
  icon?: string;
  platform: string;
  config_entry_id?: string;
  device_id?: string;
  disabled_by: string | null;
}

export interface ExtEntityRegistryEntry extends EntityRegistryEntry {
  unique_id: string;
  capabilities: Record<string, unknown>;
  original_name?: string;
  original_icon?: string;
}

export interface EntityRegistryEntryUpdateParams {
  name?: string | null;
  icon?: string | null;
  disabled_by?: string | null;
  new_entity_id?: string;
}

export const findBatteryEntity = (
  hass: HomeAssistant,
  entities: EntityRegistryEntry[]
): EntityRegistryEntry | undefined =>
  entities.find(
    (entity) =>
      hass.states[entity.entity_id] &&
      hass.states[entity.entity_id].attributes.device_class === "battery"
  );

export const findBatteryChargingEntity = (
  hass: HomeAssistant,
  entities: EntityRegistryEntry[]
): EntityRegistryEntry | undefined =>
  entities.find(
    (entity) =>
      hass.states[entity.entity_id] &&
      hass.states[entity.entity_id].attributes.device_class ===
        "battery_charging"
  );

export const computeEntityRegistryName = (
  hass: HomeAssistant,
  entry: EntityRegistryEntry
): string | null => {
  if (entry.name) {
    return entry.name;
  }
  const state = hass.states[entry.entity_id];
  return state ? computeStateName(state) : null;
};

export const getExtendedEntityRegistryEntry = (
  hass: HomeAssistant,
  entityId: string
): Promise<ExtEntityRegistryEntry> =>
  hass.callWS({
    type: "config/entity_registry/get",
    entity_id: entityId,
  });

export const updateEntityRegistryEntry = (
  hass: HomeAssistant,
  entityId: string,
  updates: Partial<EntityRegistryEntryUpdateParams>
): Promise<ExtEntityRegistryEntry> =>
  hass.callWS({
    type: "config/entity_registry/update",
    entity_id: entityId,
    ...updates,
  });

export const removeEntityRegistryEntry = (
  hass: HomeAssistant,
  entityId: string
): Promise<void> =>
  hass.callWS({
    type: "config/entity_registry/remove",
    entity_id: entityId,
  });

const fetchEntityRegistry = (conn) =>
  conn.sendMessagePromise({
    type: "config/entity_registry/list",
  });

const subscribeEntityRegistryUpdates = (conn, store) =>
  conn.subscribeEvents(
    debounce(
      () =>
        fetchEntityRegistry(conn).then((entities) =>
          store.setState(entities, true)
        ),
      500,
      true
    ),
    "entity_registry_updated"
  );

export const subscribeEntityRegistry = (
  conn: Connection,
  onChange: (entities: EntityRegistryEntry[]) => void
) =>
  createCollection<EntityRegistryEntry[]>(
    "_entityRegistry",
    fetchEntityRegistry,
    subscribeEntityRegistryUpdates,
    conn,
    onChange
  );
