import type { AreaRegistryEntry } from "../../data/area_registry";
import type { FloorRegistryEntry } from "../../data/floor_registry";
import type { HomeAssistant } from "../../types";

interface AreaContext {
  floor: FloorRegistryEntry | null;
}
export const getAreaContext = (
  area: AreaRegistryEntry,
  hass: HomeAssistant
): AreaContext => {
  const floorId = area.floor_id;
  const floor = floorId ? hass.floors[floorId] : null;

  return {
    floor: floor,
  };
};
