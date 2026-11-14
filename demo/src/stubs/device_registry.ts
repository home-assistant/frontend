import type { DeviceRegistryEntry } from "../../../src/data/device/device_registry";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

/** The fields of a device that the demo devices leave at their default. */
export const baseDevice: Omit<
  DeviceRegistryEntry,
  | "id"
  | "name"
  | "manufacturer"
  | "model"
  | "config_entries"
  | "primary_config_entry"
  | "entry_type"
> = {
  config_entries_subentries: {},
  connections: [],
  identifiers: [],
  model_id: null,
  labels: [],
  sw_version: null,
  hw_version: null,
  serial_number: null,
  via_device_id: null,
  area_id: null,
  name_by_user: null,
  disabled_by: null,
  configuration_url: null,
  parent_device_id: null,
  created_at: 0,
  modified_at: 0,
};

export interface DemoDevice {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  area_id?: string;
  via_device_id?: string;
  entry_type?: "service";
}

export const toDeviceRegistryEntry = (
  device: DemoDevice
): DeviceRegistryEntry => ({
  ...baseDevice,
  id: device.id,
  name: device.name,
  manufacturer: device.manufacturer ?? null,
  model: device.model ?? null,
  area_id: device.area_id ?? null,
  via_device_id: device.via_device_id ?? null,
  entry_type: device.entry_type ?? null,
  config_entries: [],
  primary_config_entry: null,
});

export const mockDeviceRegistry = (
  hass: MockHomeAssistant,
  data: DeviceRegistryEntry[] = []
) => {
  hass.mockWS("config/device_registry/list", () => data);
  const devices = {};
  data.forEach((device) => {
    devices[device.id] = device;
  });
  hass.updateHass({ devices });
};
