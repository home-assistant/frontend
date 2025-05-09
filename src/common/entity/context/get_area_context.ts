import type { AreaRegistryEntry } from "../../../data/area_registry";
import type { FloorRegistryEntry } from "../../../data/floor_registry";
import type { HomeAssistant } from "../../../types";

interface AreaContext {
  area: AreaRegistryEntry | null;
  floor: FloorRegistryEntry | null;
}
export const getAreaContext = (
  area: AreaRegistryEntry,
  hass: HomeAssistant
): AreaContext => {
  const floorId = area.floor_id;
  const floor = floorId ? hass.floors[floorId] : undefined;

  return {
    area: area,
    floor: floor || null,
  };
};
