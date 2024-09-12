import { stringCompare } from "../common/string/compare";
import { HomeAssistant } from "../types";
import { AreaRegistryEntry } from "./area_registry";
import { RegistryEntry } from "./registry";

export { subscribeAreaRegistry } from "./ws-area_registry";

export interface FloorRegistryEntry extends RegistryEntry {
  floor_id: string;
  name: string;
  level: number | null;
  icon: string | null;
  aliases: string[];
}

export interface FloorAreaLookup {
  [floorId: string]: AreaRegistryEntry[];
}

export interface FloorRegistryEntryMutableParams {
  name: string;
  level?: number | null;
  icon?: string | null;
  aliases?: string[];
}

export const createFloorRegistryEntry = (
  hass: HomeAssistant,
  values: FloorRegistryEntryMutableParams
) =>
  hass.callWS<FloorRegistryEntry>({
    type: "config/floor_registry/create",
    ...values,
  });

export const updateFloorRegistryEntry = (
  hass: HomeAssistant,
  floorId: string,
  updates: Partial<FloorRegistryEntryMutableParams>
) =>
  hass.callWS<AreaRegistryEntry>({
    type: "config/floor_registry/update",
    floor_id: floorId,
    ...updates,
  });

export const deleteFloorRegistryEntry = (
  hass: HomeAssistant,
  floorId: string
) =>
  hass.callWS({
    type: "config/floor_registry/delete",
    floor_id: floorId,
  });

export const getFloorAreaLookup = (
  areas: AreaRegistryEntry[]
): FloorAreaLookup => {
  const floorAreaLookup: FloorAreaLookup = {};
  for (const area of areas) {
    if (!area.floor_id) {
      continue;
    }
    if (!(area.floor_id in floorAreaLookup)) {
      floorAreaLookup[area.floor_id] = [];
    }
    floorAreaLookup[area.floor_id].push(area);
  }
  return floorAreaLookup;
};

export const floorCompare =
  (entries?: FloorRegistryEntry[], order?: string[]) =>
  (a: string, b: string) => {
    const indexA = order ? order.indexOf(a) : -1;
    const indexB = order ? order.indexOf(b) : -1;
    if (indexA === -1 && indexB === -1) {
      const nameA = entries?.[a]?.name ?? a;
      const nameB = entries?.[b]?.name ?? b;
      return stringCompare(nameA, nameB);
    }
    if (indexA === -1) {
      return 1;
    }
    if (indexB === -1) {
      return -1;
    }
    return indexA - indexB;
  };
