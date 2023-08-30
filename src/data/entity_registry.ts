import { Connection, createCollection } from "home-assistant-js-websocket";
import { Store } from "home-assistant-js-websocket/dist/store";
import memoizeOne from "memoize-one";
import { computeStateName } from "../common/entity/compute_state_name";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { debounce } from "../common/util/debounce";
import { HomeAssistant } from "../types";
import { LightColor } from "./light";
import { computeDomain } from "../common/entity/compute_domain";

type entityCategory = "config" | "diagnostic";

export interface EntityRegistryDisplayEntry {
  entity_id: string;
  name?: string;
  device_id?: string;
  area_id?: string;
  hidden?: boolean;
  entity_category?: entityCategory;
  translation_key?: string;
  platform?: string;
  display_precision?: number;
}

interface EntityRegistryDisplayEntryResponse {
  entities: {
    ei: string;
    di?: string;
    ai?: string;
    ec?: number;
    en?: string;
    pl?: string;
    tk?: string;
    hb?: boolean;
    dp?: number;
  }[];
  entity_categories: Record<number, entityCategory>;
}

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
  entity_category: entityCategory | null;
  has_entity_name: boolean;
  original_name?: string;
  unique_id: string;
  translation_key?: string;
  options: EntityRegistryOptions | null;
}

export interface ExtEntityRegistryEntry extends EntityRegistryEntry {
  capabilities: Record<string, unknown>;
  original_icon?: string;
  device_class?: string;
  original_device_class?: string;
  aliases: string[];
}

export interface UpdateEntityRegistryEntryResult {
  entity_entry: ExtEntityRegistryEntry;
  reload_delay?: number;
  require_restart?: boolean;
}

export interface SensorEntityOptions {
  display_precision?: number | null;
  suggested_display_precision?: number | null;
  unit_of_measurement?: string | null;
}

export interface LightEntityOptions {
  favorite_colors?: LightColor[];
}

export interface NumberEntityOptions {
  unit_of_measurement?: string | null;
}

export interface LockEntityOptions {
  default_code?: string | null;
}

export interface WeatherEntityOptions {
  precipitation_unit?: string | null;
  pressure_unit?: string | null;
  temperature_unit?: string | null;
  visibility_unit?: string | null;
  wind_speed_unit?: string | null;
}

export interface SwitchAsXEntityOptions {
  entity_id: string;
}

export interface EntityRegistryOptions {
  number?: NumberEntityOptions;
  sensor?: SensorEntityOptions;
  lock?: LockEntityOptions;
  weather?: WeatherEntityOptions;
  light?: LightEntityOptions;
  switch_as_x?: SwitchAsXEntityOptions;
  conversation?: Record<string, unknown>;
  "cloud.alexa"?: Record<string, unknown>;
  "cloud.google_assistant"?: Record<string, unknown>;
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
  options?:
    | SensorEntityOptions
    | NumberEntityOptions
    | LockEntityOptions
    | WeatherEntityOptions
    | LightEntityOptions;
  aliases?: string[];
}

const batteryPriorities = ["sensor", "binary_sensor"];
export const findBatteryEntity = <T extends { entity_id: string }>(
  hass: HomeAssistant,
  entities: T[]
): T | undefined => {
  const batteryEntities = entities
    .filter(
      (entity) =>
        hass.states[entity.entity_id] &&
        hass.states[entity.entity_id].attributes.device_class === "battery" &&
        batteryPriorities.includes(computeDomain(entity.entity_id))
    )
    .sort(
      (a, b) =>
        batteryPriorities.indexOf(computeDomain(a.entity_id)) -
        batteryPriorities.indexOf(computeDomain(b.entity_id))
    );
  if (batteryEntities.length > 0) {
    return batteryEntities[0];
  }

  return undefined;
};

export const findBatteryChargingEntity = <T extends { entity_id: string }>(
  hass: HomeAssistant,
  entities: T[]
): T | undefined =>
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

export const getExtendedEntityRegistryEntries = (
  hass: HomeAssistant,
  entityIds: string[]
): Promise<Record<string, ExtEntityRegistryEntry>> =>
  hass.callWS({
    type: "config/entity_registry/get_entries",
    entity_ids: entityIds,
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

export const fetchEntityRegistryDisplay = (conn: Connection) =>
  conn.sendMessagePromise<EntityRegistryDisplayEntryResponse>({
    type: "config/entity_registry/list_for_display",
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

export const sortEntityRegistryByName = (
  entries: EntityRegistryEntry[],
  language: string
) =>
  entries.sort((entry1, entry2) =>
    caseInsensitiveStringCompare(entry1.name || "", entry2.name || "", language)
  );

export const entityRegistryByEntityId = memoizeOne(
  (entries: EntityRegistryEntry[]) => {
    const entities: Record<string, EntityRegistryEntry> = {};
    for (const entity of entries) {
      entities[entity.entity_id] = entity;
    }
    return entities;
  }
);

export const entityRegistryById = memoizeOne(
  (entries: EntityRegistryEntry[]) => {
    const entities: Record<string, EntityRegistryEntry> = {};
    for (const entity of entries) {
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
