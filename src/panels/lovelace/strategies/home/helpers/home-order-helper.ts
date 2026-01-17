import type { AreaRegistryEntry } from "../../../../../data/area/area_registry";
import type { AreasFloorOrder } from "../../../../../data/frontend";
import type { FloorRegistryEntry } from "../../../../../data/floor_registry";
import type { AreasFloorHierarchy } from "../../../../../common/areas/areas-floor-hierarchy";
import { orderCompare } from "../../../../../common/string/compare";

/**
 * Applies custom floor ordering to an array of floors.
 * If no custom order is provided, returns the floors in their original order.
 * Floors not in the custom order array will be placed at the end.
 *
 * @param floors - Array of floor registry entries to sort
 * @param floorOrder - Optional array of floor IDs in desired order
 * @returns Sorted array of floors
 */
export const applyFloorOrder = (
  floors: FloorRegistryEntry[],
  floorOrder?: string[]
): FloorRegistryEntry[] => {
  if (!floorOrder || floorOrder.length === 0) {
    return floors;
  }

  const compare = orderCompare(floorOrder);
  return [...floors].sort((a, b) => compare(a.floor_id, b.floor_id));
};

/**
 * Applies custom area ordering to a floor-area hierarchy.
 * If no custom order is provided, returns the hierarchy unchanged.
 * This function sorts areas within each floor according to the areas map.
 *
 * @param hierarchy - Floor-area hierarchy to apply ordering to
 * @param areasOrder - Optional custom ordering configuration
 * @returns Hierarchy with custom ordering applied
 */
export const applyAreasOrder = (
  hierarchy: AreasFloorHierarchy,
  areasOrder?: AreasFloorOrder
): AreasFloorHierarchy => {
  if (!areasOrder) {
    return hierarchy;
  }

  // Sort areas within each floor if custom order is provided
  const floors = hierarchy.floors.map((floorData) => {
    const floorId = floorData.id;
    const floorAreasOrder = areasOrder.areas?.[floorId];

    if (!floorAreasOrder || floorAreasOrder.length === 0) {
      return floorData;
    }

    return {
      ...floorData,
      areas: sortByOrder(floorData.areas, floorAreasOrder),
    };
  });

  return {
    floors,
    areas: hierarchy.areas,
  };
};

/**
 * Helper function to sort a string array based on a custom order array.
 * Items not in the order array will be placed at the end in their original order.
 *
 * @param items - Array of strings to sort
 * @param order - Array defining the desired order
 * @returns Sorted array of strings
 */
const sortByOrder = (items: string[], order: string[]): string[] => {
  const compare = orderCompare(order);
  return [...items].sort(compare);
};

/**
 * Builds an AreasFloorOrder configuration from a floor-area hierarchy.
 * This is useful for converting the current display state into a
 * saveable configuration format.
 *
 * @param hierarchy - Floor-area hierarchy to convert
 * @returns AreasFloorOrder configuration object
 */
export const buildAreasOrderFromHierarchy = (
  hierarchy: AreasFloorHierarchy
): AreasFloorOrder => ({
  floors: hierarchy.floors.map((f) => f.id),
  areas: Object.fromEntries(hierarchy.floors.map((f) => [f.id, f.areas])),
});

/**
 * Filters out stale area and floor IDs from a custom order configuration.
 * This removes references to areas or floors that no longer exist in the registries.
 *
 * @param areasOrder - Custom order configuration to clean
 * @param areas - Current area registry entries
 * @param floors - Current floor registry entries
 * @returns Cleaned configuration with only valid IDs
 */
export const cleanStaleAreasOrder = (
  areasOrder: AreasFloorOrder,
  areas: AreaRegistryEntry[],
  floors: FloorRegistryEntry[]
): AreasFloorOrder => {
  const validAreaIds = new Set(areas.map((a) => a.area_id));
  const validFloorIds = new Set(floors.map((f) => f.floor_id));

  // Filter floor order to only include existing floors
  const cleanedFloors = areasOrder.floors?.filter((floorId) =>
    validFloorIds.has(floorId)
  );

  // Filter areas for each floor to only include existing areas
  const cleanedAreas: Record<string, string[]> = {};
  if (areasOrder.areas) {
    for (const [floorId, areaIds] of Object.entries(areasOrder.areas)) {
      if (validFloorIds.has(floorId)) {
        const validAreas = areaIds.filter((areaId) => validAreaIds.has(areaId));
        if (validAreas.length > 0) {
          cleanedAreas[floorId] = validAreas;
        }
      }
    }
  }

  return {
    floors: cleanedFloors,
    areas: Object.keys(cleanedAreas).length > 0 ? cleanedAreas : undefined,
  };
};
