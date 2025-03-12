import type { AreaRegistryEntry } from "../../../../../data/area_registry";
import { areaCompare } from "../../../../../data/area_registry";
import type { HomeAssistant } from "../../../../../types";

export const getAreas = (
  entries: HomeAssistant["areas"],
  hiddenAreas?: string[],
  areasOrder?: string[]
): AreaRegistryEntry[] => {
  const areas = Object.values(entries);

  const filteredAreas = hiddenAreas
    ? areas.filter((area) => !hiddenAreas!.includes(area.area_id))
    : areas.concat();

  const compare = areaCompare(entries, areasOrder);

  const sortedAreas = filteredAreas.sort((areaA, areaB) =>
    compare(areaA.area_id, areaB.area_id)
  );

  return sortedAreas;
};
