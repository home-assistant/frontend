import type { AreaRegistryEntry } from "../../../data/area/area_registry";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import type { HomeAssistant } from "../../../types";

/**
 * Return the effective area id of a device: a child device without an area of
 * its own inherits its parent's area (mirrors core's
 * async_get_effective_area_id). Nesting is single-level, so no recursion.
 */
export const getDeviceAreaId = (
  device: DeviceRegistryEntry,
  devices: HomeAssistant["devices"]
): string | undefined => {
  if (device.area_id) {
    return device.area_id;
  }
  if (device.parent_device_id) {
    return devices[device.parent_device_id]?.area_id ?? undefined;
  }
  return undefined;
};

export const getDeviceArea = (
  device: DeviceRegistryEntry,
  areas: HomeAssistant["areas"],
  // Required so every caller resolves a child device's effective area
  // consistently, see getDeviceAreaId.
  devices: HomeAssistant["devices"]
): AreaRegistryEntry | undefined => {
  const areaId = getDeviceAreaId(device, devices);
  return areaId ? areas[areaId] : undefined;
};
