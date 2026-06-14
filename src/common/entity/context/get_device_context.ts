import type { AreaRegistryEntry } from "../../../data/area/area_registry";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import type { HomeAssistant } from "../../../types";

export const getDeviceArea = (
  device: DeviceRegistryEntry,
  areas: HomeAssistant["areas"]
): AreaRegistryEntry | undefined => {
  const areaId = device.area_id;
  return areaId ? areas[areaId] : undefined;
};
