import type { AreaRegistryEntry } from "../../data/area_registry";

export const computeAreaName = (area: AreaRegistryEntry): string | undefined =>
  area.name?.trim();
