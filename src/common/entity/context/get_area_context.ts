import type { AreaRegistryEntry } from "../../../data/area_registry";
import type { FloorRegistryEntry } from "../../../data/floor_registry";
import type { HomeAssistant } from "../../../types";

interface AreaContext {
  area: AreaRegistryEntry | null;
  floor: FloorRegistryEntry | null;
}

/**
 * Retrieves the context of a specific area, including its associated area registry entry
 * and floor registry entry, if available.
 *
 * @param areaId - The unique identifier of the area to retrieve context for.
 * @param hass - The Home Assistant instance containing area and floor registry data.
 * @returns An object containing the area registry entry and the associated floor registry entry,
 *          or `null` values if the area or floor is not found.
 */
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
