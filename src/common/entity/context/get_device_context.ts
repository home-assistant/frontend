import type { AreaRegistryEntry } from "../../../data/area/area_registry";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import type { FloorRegistryEntry } from "../../../data/floor_registry";
import type { HomeAssistant } from "../../../types";

interface DeviceContext {
  device: DeviceRegistryEntry;
  area: AreaRegistryEntry | null;
  floor: FloorRegistryEntry | null;
}

export const getDeviceContext = (
  device: DeviceRegistryEntry,
  areas: HomeAssistant["areas"],
  floors?: HomeAssistant["floors"]
): DeviceContext => {
  const areaId = device.area_id;
  const area = areaId ? areas[areaId] : undefined;
  const floorId = area?.floor_id;
  let floor: FloorRegistryEntry | null = null;
  if (floors && floorId) {
    floor = floors[floorId];
  }

  return {
    device: device,
    area: area || null,
    floor: floor || null,
  };
};
