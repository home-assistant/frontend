import type { AreaRegistryEntry } from "../../../../../data/area_registry";
import type { FloorRegistryEntry } from "../../../../../data/floor_registry";

interface HomeStructure {
  floors: {
    id: string;
    areas: string[];
  }[];
  areas: string[];
}

export const getHomeStructure = (
  floors: FloorRegistryEntry[],
  areas: AreaRegistryEntry[]
): HomeStructure => {
  const floorAreas = new Map<string, string[]>();
  const unassignedAreas: string[] = [];

  for (const area of areas) {
    if (area.floor_id) {
      if (!floorAreas.has(area.floor_id)) {
        floorAreas.set(area.floor_id, []);
      }
      floorAreas.get(area.floor_id)!.push(area.area_id);
    } else {
      unassignedAreas.push(area.area_id);
    }
  }

  const homeStructure: HomeStructure = {
    floors: floors.map((floor) => ({
      id: floor.floor_id,
      areas: floorAreas.get(floor.floor_id) || [],
    })),
    areas: unassignedAreas,
  };

  return homeStructure;
};
