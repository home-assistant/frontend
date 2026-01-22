import type { AreaRegistryEntry } from "../../data/area/area_registry";
import type { FloorRegistryEntry } from "../../data/floor_registry";

export interface AreasFloorHierarchy {
  floors: {
    id: string;
    areas: string[];
  }[];
  areas: string[];
}

export const getAreasFloorHierarchy = (
  floors: FloorRegistryEntry[],
  areas: AreaRegistryEntry[]
): AreasFloorHierarchy => {
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

  const hierarchy: AreasFloorHierarchy = {
    floors: floors.map((floor) => ({
      id: floor.floor_id,
      areas: floorAreas.get(floor.floor_id) || [],
    })),
    areas: unassignedAreas,
  };

  return hierarchy;
};

export const getAreasOrder = (hierarchy: AreasFloorHierarchy): string[] => {
  const order: string[] = [];

  for (const floor of hierarchy.floors) {
    order.push(...floor.areas);
  }
  order.push(...hierarchy.areas);

  return order;
};

export const getFloorOrder = (hierarchy: AreasFloorHierarchy): string[] =>
  hierarchy.floors.map((floor) => floor.id);
