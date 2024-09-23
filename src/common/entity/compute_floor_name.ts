import { FloorRegistryEntry } from "../../data/floor_registry";

export const computeFloorName = (
  floor: FloorRegistryEntry
): string | undefined => floor.name?.trim();
