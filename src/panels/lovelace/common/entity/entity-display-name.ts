import type { HassEntity } from "home-assistant-js-websocket";
import { ensureArray } from "../../../../common/array/ensure-array";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import type { EntityNameType } from "../../../../common/translations/entity-state";
import type { HomeAssistant } from "../../../../types";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeFloorName } from "../../../../common/entity/compute_floor_name";

interface TextName {
  type: "text";
  text: string;
}

interface ContextType {
  type: EntityNameType;
}

export type EntityNameItem = TextName | ContextType;

export const ensureEntityNameItems = (
  name: EntityNameConfig
): EntityNameItem[] =>
  ensureArray(name).map((n) =>
    typeof n === "string" ? { type: "text", text: n } : n
  );

export type EntityNameConfig =
  | (EntityNameItem | string)[]
  | EntityNameItem
  | string;

export const formatEntityDisplayName = (
  hass: HomeAssistant,
  stateObj: HassEntity,
  name?: EntityNameConfig
) => {
  if (typeof name === "string") {
    return name;
  }
  if (!name) {
    return computeStateName(stateObj);
  }

  let items = ensureEntityNameItems(name);

  // If custom name does not include any of the known types, just join and return
  if (!items.some((n) => n.type !== "text")) {
    return items.join(" ");
  }

  const entityUseDeviceName = !computeEntityName(
    stateObj,
    hass.entities,
    hass.devices
  );

  // If entity has no custom name, use device name instead of entity name
  if (entityUseDeviceName) {
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
    hass.entities,
    hass.devices,
    hass.areas,
    hass.floors
  );

  const formattedName = items
    .map((item) => {
      switch (item.type) {
        case "entity":
          return computeEntityName(stateObj, hass.entities, hass.devices);
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
    .join(" ");

  // Fallback to state name (friendly name) if no name could be computed
  return formattedName || computeStateName(stateObj);
};
