import { Connection, createCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import { computeStateName } from "../common/entity/compute_state_name";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { debounce } from "../common/util/debounce";
import type { HomeAssistant } from "../types";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "./entity_registry";
import type { EntitySources } from "./entity_sources";

export interface DeviceRegistryEntry {
  id: string;
  config_entries: string[];
  connections: Array<[string, string]>;
  identifiers: Array<[string, string]>;
  manufacturer: string | null;
  model: string | null;
  name: string | null;
  sw_version: string | null;
  hw_version: string | null;
  serial_number: string | null;
  via_device_id: string | null;
  area_id: string | null;
  name_by_user: string | null;
  entry_type: "service" | null;
  disabled_by: "user" | "integration" | "config_entry" | null;
  configuration_url: string | null;
}

export interface DeviceEntityDisplayLookup {
  [deviceId: string]: EntityRegistryDisplayEntry[];
}

export interface DeviceEntityLookup {
  [deviceId: string]: EntityRegistryEntry[];
}

export interface DeviceRegistryEntryMutableParams {
  area_id?: string | null;
  name_by_user?: string | null;
  disabled_by?: string | null;
}

export const fallbackDeviceName = (
  hass: HomeAssistant,
  entities: EntityRegistryEntry[] | string[]
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

export const computeDeviceName = (
  device: DeviceRegistryEntry,
  hass: HomeAssistant,
  entities?: EntityRegistryEntry[] | string[]
) =>
  device.name_by_user ||
  device.name ||
  (entities && fallbackDeviceName(hass, entities)) ||
  hass.localize(
    "ui.panel.config.devices.unnamed_device",
    "type",
    hass.localize(
      `ui.panel.config.devices.type.${device.entry_type || "device"}`
    )
  );

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

export const fetchDeviceRegistry = (conn: Connection) =>
  conn.sendMessagePromise<DeviceRegistryEntry[]>({
    type: "config/device_registry/list",
  });

const subscribeDeviceRegistryUpdates = (
  conn: Connection,
  store: Store<DeviceRegistryEntry[]>
) =>
  conn.subscribeEvents(
    debounce(
      () =>
        fetchDeviceRegistry(conn).then((devices) =>
          store.setState(devices, true)
        ),
      500,
      true
    ),
    "device_registry_updated"
  );

export const subscribeDeviceRegistry = (
  conn: Connection,
  onChange: (devices: DeviceRegistryEntry[]) => void
) =>
  createCollection<DeviceRegistryEntry[]>(
    "_dr",
    fetchDeviceRegistry,
    subscribeDeviceRegistryUpdates,
    conn,
    onChange
  );

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
  entities: EntityRegistryDisplayEntry[]
): Record<string, string[]> => {
  const deviceIntegrations: Record<string, string[]> = {};

  for (const entity of entities) {
    const source = entitySources[entity.entity_id];
    if (!source?.domain || entity.device_id === null) {
      continue;
    }

    if (!deviceIntegrations[entity.device_id!]) {
      deviceIntegrations[entity.device_id!] = [];
    }
    deviceIntegrations[entity.device_id!].push(source.domain);
  }
  return deviceIntegrations;
};
