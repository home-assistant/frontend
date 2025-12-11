import type { DeviceRegistryEntry } from "./device_registry";

export const filterUnassignedDevices = (
  devices: Record<string, DeviceRegistryEntry>
): DeviceRegistryEntry[] =>
  Object.values(devices).filter(
    (device) =>
      device.area_id === null &&
      device.disabled_by === null &&
      device.entry_type !== "service"
  );

export const countUnassignedDevices = (
  devices: Record<string, DeviceRegistryEntry>
): number => filterUnassignedDevices(devices).length;
