import type { HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../../types";
import { ensureArray } from "../array/ensure-array";
import { computeAreaName } from "./compute_area_name";
import { computeDeviceName } from "./compute_device_name";
import { computeEntityName, entityUseDeviceName } from "./compute_entity_name";
import { computeFloorName } from "./compute_floor_name";
import { getEntityContext } from "./context/get_entity_context";

const DEFAULT_SEPARATOR = " ";

export type EntityNameItem =
  | {
      type: "entity" | "device" | "area" | "floor";
    }
  | {
      type: "text";
      text: string;
    };

export interface EntityNameOptions {
  separator?: string;
}

export const computeEntityNameDisplay = (
  stateObj: HassEntity,
  name: EntityNameItem | EntityNameItem[],
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"],
  areas: HomeAssistant["areas"],
  floors: HomeAssistant["floors"],
  options?: EntityNameOptions
) => {
  let items = ensureArray(name);

  const separator = options?.separator ?? DEFAULT_SEPARATOR;

  // If all items are text, just join them
  if (items.every((n) => n.type === "text")) {
    return items.map((item) => item.text).join(separator);
  }

  const useDeviceName = entityUseDeviceName(stateObj, entities, devices);

  // If entity has no custom name, use device name instead of empty entity name
  if (useDeviceName) {
    items = items.map((n) => (n.type === "entity" ? { type: "device" } : n));
  }

  // Remove duplicates type while preserving order (only if they are known types)
  if (items.length > 1) {
    items = items.filter(
      (n, i) =>
        !(
          n.type !== "text" &&
          items.findIndex((item) => item.type === n.type) < i
        )
    );
  }

  const { device, area, floor } = getEntityContext(
    stateObj,
    entities,
    devices,
    areas,
    floors
  );

  const formattedName = items
    .map((item) => {
      switch (item.type) {
        case "entity":
          return computeEntityName(stateObj, entities, devices);
        case "device":
          return device ? computeDeviceName(device) : undefined;
        case "area":
          return area ? computeAreaName(area) : undefined;
        case "floor":
          return floor ? computeFloorName(floor) : undefined;
        case "text":
          return item.text;
        default:
          return "";
      }
    })
    .filter((n) => n)
    .join(separator);

  return formattedName;
};
