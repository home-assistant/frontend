import type { Connection, HassEntity } from "home-assistant-js-websocket";
import { createCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import memoizeOne from "memoize-one";
import { computeDomain } from "../common/entity/compute_domain";
import { computeEntityNameList } from "../common/entity/compute_entity_name_display";
import { computeStateName } from "../common/entity/compute_state_name";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { computeRTL } from "../common/util/compute_rtl";
import { debounce } from "../common/util/debounce";
import type { PickerComboBoxItem } from "../components/ha-picker-combo-box";
import type { HomeAssistant } from "../types";
import type { HaEntityPickerEntityFilterFunc } from "./entity";
import { domainToName } from "./integration";
import type { LightColor } from "./light";
import type { RegistryEntry } from "./registry";

type EntityCategory = "config" | "diagnostic";

export interface EntityRegistryDisplayEntry {
  entity_id: string;
  name?: string;
  icon?: string;
  device_id?: string;
  area_id?: string;
  labels: string[];
  hidden?: boolean;
  entity_category?: EntityCategory;
  translation_key?: string;
  platform?: string;
  display_precision?: number;
  has_entity_name?: boolean;
}

export interface EntityRegistryDisplayEntryResponse {
  entities: {
    ei: string;
    di?: string;
    ai?: string;
    lb: string[];
    ec?: number;
    en?: string;
    ic?: string;
    pl?: string;
    tk?: string;
    hb?: boolean;
    dp?: number;
    hn?: boolean;
  }[];
  entity_categories: Record<number, EntityCategory>;
}

export interface EntityRegistryEntry extends RegistryEntry {
  id: string;
  entity_id: string;
  name: string | null;
  icon: string | null;
  platform: string;
  config_entry_id: string | null;
  config_subentry_id: string | null;
  device_id: string | null;
  area_id: string | null;
  labels: string[];
  disabled_by: "user" | "device" | "integration" | "config_entry" | null;
  hidden_by: Exclude<EntityRegistryEntry["disabled_by"], "config_entry">;
  entity_category: EntityCategory | null;
  has_entity_name: boolean;
  original_name?: string;
  unique_id: string;
  translation_key?: string;
  options: EntityRegistryOptions | null;
  categories: Record<string, string>;
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

export interface AlarmControlPanelEntityOptions {
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
  invert: boolean;
}

export interface EntityRegistryOptions {
  number?: NumberEntityOptions;
  sensor?: SensorEntityOptions;
  alarm_control_panel?: AlarmControlPanelEntityOptions;
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
    | AlarmControlPanelEntityOptions
    | WeatherEntityOptions
    | LightEntityOptions;
  aliases?: string[];
  labels?: string[];
  categories?: Record<string, string | null>;
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

export const getAutomaticEntityIds = (
  hass: HomeAssistant,
  entity_ids: string[]
) =>
  hass.callWS<Record<string, string | null>>({
    type: "config/entity_registry/get_automatic_entity_ids",
    entity_ids,
  });

export interface EntityComboBoxItem extends PickerComboBoxItem {
  domain_name?: string;
  stateObj?: HassEntity;
}

export const getEntities = (
  hass: HomeAssistant,
  includeDomains?: string[],
  excludeDomains?: string[],
  entityFilter?: HaEntityPickerEntityFilterFunc,
  includeDeviceClasses?: string[],
  includeUnitOfMeasurement?: string[],
  includeEntities?: string[],
  excludeEntities?: string[],
  value?: string
): EntityComboBoxItem[] =>
  memoizeOne(
    (
      hassMemo: HomeAssistant,
      isRTLMemo: boolean,
      includeDomainsMemo?: string[],
      excludeDomainsMemo?: string[],
      entityFilterMemo?: HaEntityPickerEntityFilterFunc,
      includeDeviceClassesMemo?: string[],
      includeUnitOfMeasurementMemo?: string[],
      includeEntitiesMemo?: string[],
      excludeEntitiesMemo?: string[]
    ): EntityComboBoxItem[] => {
      let items: EntityComboBoxItem[] = [];

      let entityIds = Object.keys(hassMemo.states);

      if (includeEntitiesMemo) {
        entityIds = entityIds.filter((entityId) =>
          includeEntitiesMemo.includes(entityId)
        );
      }

      if (excludeEntitiesMemo) {
        entityIds = entityIds.filter(
          (entityId) => !excludeEntitiesMemo.includes(entityId)
        );
      }

      if (includeDomainsMemo) {
        entityIds = entityIds.filter((eid) =>
          includeDomainsMemo.includes(computeDomain(eid))
        );
      }

      if (excludeDomainsMemo) {
        entityIds = entityIds.filter(
          (eid) => !excludeDomainsMemo.includes(computeDomain(eid))
        );
      }

      items = entityIds.map<EntityComboBoxItem>((entityId) => {
        const stateObj = hassMemo.states[entityId];

        const friendlyName = computeStateName(stateObj); // Keep this for search
        const [entityName, deviceName, areaName] = computeEntityNameList(
          stateObj,
          [{ type: "entity" }, { type: "device" }, { type: "area" }],
          hassMemo.entities,
          hassMemo.devices,
          hassMemo.areas,
          hassMemo.floors
        );

        const domainName = domainToName(
          hassMemo.localize,
          computeDomain(entityId)
        );

        const primary = entityName || deviceName || entityId;
        const secondary = [areaName, entityName ? deviceName : undefined]
          .filter(Boolean)
          .join(isRTLMemo ? " ◂ " : " ▸ ");
        const a11yLabel = [deviceName, entityName].filter(Boolean).join(" - ");

        return {
          id: entityId,
          primary: primary,
          secondary: secondary,
          domain_name: domainName,
          sorting_label: [deviceName, entityName].filter(Boolean).join("_"),
          search_labels: [
            entityName,
            deviceName,
            areaName,
            domainName,
            friendlyName,
            entityId,
          ].filter(Boolean) as string[],
          a11y_label: a11yLabel,
          stateObj: stateObj,
        };
      });

      if (includeDeviceClassesMemo) {
        items = items.filter(
          (item) =>
            // We always want to include the entity of the current value
            item.id === value ||
            (item.stateObj?.attributes.device_class &&
              includeDeviceClassesMemo.includes(
                item.stateObj.attributes.device_class
              ))
        );
      }

      if (includeUnitOfMeasurementMemo) {
        items = items.filter(
          (item) =>
            // We always want to include the entity of the current value
            item.id === value ||
            (item.stateObj?.attributes.unit_of_measurement &&
              includeUnitOfMeasurementMemo.includes(
                item.stateObj.attributes.unit_of_measurement
              ))
        );
      }

      if (entityFilterMemo) {
        items = items.filter(
          (item) =>
            // We always want to include the entity of the current value
            item.id === value ||
            (item.stateObj && entityFilterMemo!(item.stateObj))
        );
      }

      return items;
    }
  )(
    hass,
    computeRTL(hass),
    includeDomains,
    excludeDomains,
    entityFilter,
    includeDeviceClasses,
    includeUnitOfMeasurement,
    includeEntities,
    excludeEntities
  );
