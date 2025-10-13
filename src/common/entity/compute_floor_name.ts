import type { FloorRegistryEntry } from "../../data/floor_registry";

export const computeFloorName = (floor: FloorRegistryEntry): string =>
  floor.name?.trim();
