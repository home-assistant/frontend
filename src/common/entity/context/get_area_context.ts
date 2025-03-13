import type { AreaRegistryEntry } from "../../../data/area_registry";
import type { FloorRegistryEntry } from "../../../data/floor_registry";
import type { HomeAssistant } from "../../../types";

interface AreaContext {
  area: AreaRegistryEntry | null;
  floor: FloorRegistryEntry | null;
}

export const getAreaContext = (
  areaId: string,
  hass: HomeAssistant
): AreaContext => {
  const area = (hass.areas[areaId] as AreaRegistryEntry | undefined) || null;

  if (!area) {
    return {
      area: null,
      floor: null,
    };
  }

  const floorId = area?.floor_id;
  const floor = floorId ? hass.floors[floorId] : null;

  return {
    area: area,
    floor: floor,
  };
};
