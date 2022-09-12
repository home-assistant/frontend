import { Connection, createCollection } from "home-assistant-js-websocket";
import { Store } from "home-assistant-js-websocket/dist/store";
import memoizeOne from "memoize-one";
import { computeStateName } from "../common/entity/compute_state_name";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { debounce } from "../common/util/debounce";
import { HomeAssistant } from "../types";

export interface EntityRegistryEntry {
  id: string;
  entity_id: string;
  name: string | null;
  icon: string | null;
  platform: string;
  config_entry_id: string | null;
  device_id: string | null;
  area_id: string | null;
  disabled_by: "user" | "device" | "integration" | "config_entry" | null;
  hidden_by: Exclude<EntityRegistryEntry["disabled_by"], "config_entry">;
  entity_category: "config" | "diagnostic" | null;
  has_entity_name: boolean;
  original_name?: string;
}

export interface ExtEntityRegistryEntry extends EntityRegistryEntry {
  unique_id: string;
  capabilities: Record<string, unknown>;
  original_icon?: string;
  device_class?: string;
  original_device_class?: string;
}

export interface UpdateEntityRegistryEntryResult {
  entity_entry: ExtEntityRegistryEntry;
  reload_delay?: number;
  require_restart?: boolean;
}

export interface SensorEntityOptions {
  unit_of_measurement?: string | null;
}

export interface NumberEntityOptions {
  unit_of_measurement?: string | null;
}

export interface WeatherEntityOptions {
  precipitation_unit?: string | null;
  pressure_unit?: string | null;
  temperature_unit?: string | null;
  visibility_unit?: string | null;
  wind_speed_unit?: string | null;
}

export interface EntityRegistryEntryUpdateParams {
  name?: string | null;
  icon?: string | null;
  device_class?: string | null;
  area_id?: string | null;
  disabled_by?: string | null;
  hidden_by: string | null;
  new_entity_id?: string;
  options_domain?: string;
  options?: SensorEntityOptions | WeatherEntityOptions;
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
  if (state) {
    return computeStateName(state);
  }
  return entry.original_name ? entry.original_name : entry.entity_id;
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
): Promise<UpdateEntityRegistryEntryResult> =>
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

export const fetchEntityRegistry = (conn: Connection) =>
  conn.sendMessagePromise<EntityRegistryEntry[]>({
    type: "config/entity_registry/list",
  });

const subscribeEntityRegistryUpdates = (
  conn: Connection,
  store: Store<EntityRegistryEntry[]>
) =>
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

export const sortEntityRegistryByName = (entries: EntityRegistryEntry[]) =>
  entries.sort((entry1, entry2) =>
    caseInsensitiveStringCompare(entry1.name || "", entry2.name || "")
  );

export const entityRegistryById = memoizeOne(
  (entries: HomeAssistant["entities"]) => {
    const entities: HomeAssistant["entities"] = {};
    for (const entity of Object.values(entries)) {
      entities[entity.id] = entity;
    }
    return entities;
  }
);

export const getEntityPlatformLookup = (
  entities: EntityRegistryEntry[]
): Record<string, string> => {
  const entityLookup = {};
  for (const confEnt of entities) {
    if (!confEnt.platform) {
      continue;
    }
    entityLookup[confEnt.entity_id] = confEnt.platform;
  }
  return entityLookup;
};
