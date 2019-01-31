import { HomeAssistant } from "../types";

export interface DeviceRegistryEntry {
  id: string;
  config_entries: string[];
  connections: Array<[string, string]>;
  manufacturer: string;
  model?: string;
  name?: string;
  sw_version?: string;
  hub_device_id?: string;
  area_id?: string;
}

export interface DeviceRegistryEntryMutableParams {
  area_id: string;
}

export const fetchDeviceRegistry = (hass: HomeAssistant) =>
  hass.callWS<DeviceRegistryEntry[]>({ type: "config/device_registry/list" });

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
