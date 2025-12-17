import type { HomeAssistant } from "../types";
import type { DeviceRegistryEntry } from "./device/device_registry";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "./entity/entity_registry";
import type { RegistryEntry } from "./registry";

export { subscribeAreaRegistry } from "./ws-area_registry";

export interface AreaRegistryEntry extends RegistryEntry {
  aliases: string[];
  area_id: string;
  floor_id: string | null;
  humidity_entity_id: string | null;
  icon: string | null;
  labels: string[];
  name: string;
  picture: string | null;
  temperature_entity_id: string | null;
}

export type AreaEntityLookup = Record<
  string,
  (EntityRegistryEntry | EntityRegistryDisplayEntry)[]
>;

export type AreaDeviceLookup = Record<string, DeviceRegistryEntry[]>;

export interface AreaRegistryEntryMutableParams {
  aliases?: string[];
  floor_id?: string | null;
  humidity_entity_id?: string | null;
  icon?: string | null;
  labels?: string[];
  name: string;
  picture?: string | null;
  temperature_entity_id?: string | null;
}

export const createAreaRegistryEntry = (
  hass: HomeAssistant,
  values: AreaRegistryEntryMutableParams
) =>
  hass.callWS<AreaRegistryEntry>({
    type: "config/area_registry/create",
    ...values,
  });

export const updateAreaRegistryEntry = (
  hass: HomeAssistant,
  areaId: string,
  updates: Partial<AreaRegistryEntryMutableParams>
) =>
  hass.callWS<AreaRegistryEntry>({
    type: "config/area_registry/update",
    area_id: areaId,
    ...updates,
  });

export const deleteAreaRegistryEntry = (hass: HomeAssistant, areaId: string) =>
  hass.callWS({
    type: "config/area_registry/delete",
    area_id: areaId,
  });

export const reorderAreaRegistryEntries = (
  hass: HomeAssistant,
  areaIds: string[]
) =>
  hass.callWS({
    type: "config/area_registry/reorder",
    area_ids: areaIds,
  });

export const getAreaEntityLookup = (
  entities: (EntityRegistryEntry | EntityRegistryDisplayEntry)[]
): AreaEntityLookup => {
  const areaEntityLookup: AreaEntityLookup = {};
  for (const entity of entities) {
    if (!entity.area_id) {
      continue;
    }
    if (!(entity.area_id in areaEntityLookup)) {
      areaEntityLookup[entity.area_id] = [];
    }
    areaEntityLookup[entity.area_id].push(entity);
  }
  return areaEntityLookup;
};

export const getAreaDeviceLookup = (
  devices: DeviceRegistryEntry[]
): AreaDeviceLookup => {
  const areaDeviceLookup: AreaDeviceLookup = {};
  for (const device of devices) {
    if (!device.area_id) {
      continue;
    }
    if (!(device.area_id in areaDeviceLookup)) {
      areaDeviceLookup[device.area_id] = [];
    }
    areaDeviceLookup[device.area_id].push(device);
  }
  return areaDeviceLookup;
};
