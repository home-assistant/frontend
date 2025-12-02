import type { AreaRegistryEntry } from "../../../data/area_registry";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import type { FloorRegistryEntry } from "../../../data/floor_registry";
import type { HomeAssistant } from "../../../types";

interface DeviceContext {
  device: DeviceRegistryEntry;
  area: AreaRegistryEntry | null;
  floor: FloorRegistryEntry | null;
}

export const getDeviceContext = (
  device: DeviceRegistryEntry,
  hass: HomeAssistant
): DeviceContext => {
  const areaId = device.area_id;
  const area = areaId ? hass.areas[areaId] : undefined;
  const floorId = area?.floor_id;
  const floor = floorId ? hass.floors[floorId] : undefined;

  return {
    device: device,
    area: area || null,
    floor: floor || null,
  };
};
