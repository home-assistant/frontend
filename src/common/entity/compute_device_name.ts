import { DeviceRegistryEntry } from "../../data/device_registry";

export const computeDeviceName = (
  device: DeviceRegistryEntry
): string | undefined => (device.name_by_user || device.name)?.trim();
