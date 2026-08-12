import type { AreaRegistryEntry } from "../../../data/area/area_registry";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import type { HomeAssistant } from "../../../types";

export const getDeviceArea = (
  device: DeviceRegistryEntry,
  areas: HomeAssistant["areas"],
  // Pass hass.devices to resolve the effective area of a child device: a child
  // without an area of its own inherits its parent's area (mirrors core's
  // async_get_effective_area_id). Nesting is single-level, so no recursion.
  devices?: HomeAssistant["devices"]
): AreaRegistryEntry | undefined => {
  if (device.area_id) {
    return areas[device.area_id];
  }
  if (device.parent_device_id && devices) {
    const parent = devices[device.parent_device_id];
    if (parent?.area_id) {
      return areas[parent.area_id];
    }
  }
  return undefined;
};
