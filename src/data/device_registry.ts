import { computeStateName } from "../common/entity/compute_state_name";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import type { HomeAssistant } from "../types";
import type { ConfigEntry } from "./config_entries";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "./entity_registry";
import type { EntitySources } from "./entity_sources";
import type { RegistryEntry } from "./registry";

export {
  fetchDeviceRegistry,
  subscribeDeviceRegistry,
} from "./ws-device_registry";

export interface DeviceRegistryEntry extends RegistryEntry {
  id: string;
  config_entries: string[];
  config_entries_subentries: Record<string, (string | null)[]>;
  connections: [string, string][];
  identifiers: [string, string][];
  manufacturer: string | null;
  model: string | null;
  model_id: string | null;
  name: string | null;
  labels: string[];
  sw_version: string | null;
  hw_version: string | null;
  serial_number: string | null;
  via_device_id: string | null;
  area_id: string | null;
  name_by_user: string | null;
  entry_type: "service" | null;
  disabled_by: "user" | "integration" | "config_entry" | null;
  configuration_url: string | null;
  primary_config_entry: string | null;
}

export type DeviceEntityDisplayLookup = Record<
  string,
  EntityRegistryDisplayEntry[]
>;

export type DeviceEntityLookup = Record<string, EntityRegistryEntry[]>;

export interface DeviceRegistryEntryMutableParams {
  area_id?: string | null;
  name_by_user?: string | null;
  disabled_by?: string | null;
  labels?: string[];
}

export const fallbackDeviceName = (
  hass: HomeAssistant,
  entities: EntityRegistryEntry[] | EntityRegistryDisplayEntry[] | string[]
) => {
  for (const entity of entities || []) {
    const entityId = typeof entity === "string" ? entity : entity.entity_id;
    const stateObj = hass.states[entityId];
    if (stateObj) {
      return computeStateName(stateObj);
    }
  }
  return undefined;
};

export const devicesInArea = (devices: DeviceRegistryEntry[], areaId: string) =>
  devices.filter((device) => device.area_id === areaId);

export const updateDeviceRegistryEntry = (
  hass: HomeAssistant,
  deviceId: string,
  updates: Partial<DeviceRegistryEntryMutableParams>
) =>
  hass.callWS<DeviceRegistryEntry>({
    type: "config/device_registry/update",
    device_id: deviceId,
    ...updates,
  });

export const removeConfigEntryFromDevice = (
  hass: HomeAssistant,
  deviceId: string,
  configEntryId: string
) =>
  hass.callWS<DeviceRegistryEntry>({
    type: "config/device_registry/remove_config_entry",
    device_id: deviceId,
    config_entry_id: configEntryId,
  });

export const sortDeviceRegistryByName = (
  entries: DeviceRegistryEntry[],
  language: string
) =>
  entries.sort((entry1, entry2) =>
    caseInsensitiveStringCompare(entry1.name || "", entry2.name || "", language)
  );

export const getDeviceEntityLookup = (
  entities: EntityRegistryEntry[]
): DeviceEntityLookup => {
  const deviceEntityLookup: DeviceEntityLookup = {};
  for (const entity of entities) {
    if (!entity.device_id) {
      continue;
    }
    if (!(entity.device_id in deviceEntityLookup)) {
      deviceEntityLookup[entity.device_id] = [];
    }
    deviceEntityLookup[entity.device_id].push(entity);
  }
  return deviceEntityLookup;
};

export const getDeviceEntityDisplayLookup = (
  entities: EntityRegistryDisplayEntry[]
): DeviceEntityDisplayLookup => {
  const deviceEntityLookup: DeviceEntityDisplayLookup = {};
  for (const entity of entities) {
    if (!entity.device_id) {
      continue;
    }
    if (!(entity.device_id in deviceEntityLookup)) {
      deviceEntityLookup[entity.device_id] = [];
    }
    deviceEntityLookup[entity.device_id].push(entity);
  }
  return deviceEntityLookup;
};

export const getDeviceIntegrationLookup = (
  entitySources: EntitySources,
  entities: EntityRegistryDisplayEntry[] | EntityRegistryEntry[],
  devices?: DeviceRegistryEntry[],
  configEntries?: ConfigEntry[]
): Record<string, Set<string>> => {
  const deviceIntegrations: Record<string, Set<string>> = {};

  for (const entity of entities) {
    const source = entitySources[entity.entity_id];
    if (!source?.domain || entity.device_id === null) {
      continue;
    }

    deviceIntegrations[entity.device_id!] =
      deviceIntegrations[entity.device_id!] || new Set<string>();
    deviceIntegrations[entity.device_id!].add(source.domain);
  }
  // Lookup devices that have no entities
  if (devices && configEntries) {
    for (const device of devices) {
      for (const config_entry_id of device.config_entries) {
        const entry = configEntries.find((e) => e.entry_id === config_entry_id);
        if (entry?.domain) {
          deviceIntegrations[device.id] =
            deviceIntegrations[device.id] || new Set<string>();
          deviceIntegrations[device.id].add(entry.domain);
        }
      }
    }
  }
  return deviceIntegrations;
};
