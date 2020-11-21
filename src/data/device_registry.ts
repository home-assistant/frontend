import { Connection, createCollection } from "home-assistant-js-websocket";
import { computeStateName } from "../common/entity/compute_state_name";
import { debounce } from "../common/util/debounce";
import { HomeAssistant } from "../types";
import { EntityRegistryEntry } from "./entity_registry";

export interface DeviceRegistryEntry {
  id: string;
  config_entries: string[];
  connections: Array<[string, string]>;
  identifiers: Array<[string, string]>;
  manufacturer: string;
  model?: string;
  name?: string;
  sw_version?: string;
  via_device_id?: string;
  area_id?: string;
  name_by_user?: string;
  entry_type: "service" | null;
  disabled_by: string | null;
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
) => {
  return (
    device.name_by_user ||
    device.name ||
    (entities && fallbackDeviceName(hass, entities)) ||
    hass.localize("ui.panel.config.devices.unnamed_device")
  );
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

export const fetchDeviceRegistry = (conn) =>
  conn.sendMessagePromise({
    type: "config/device_registry/list",
  });

const subscribeDeviceRegistryUpdates = (conn, store) =>
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
