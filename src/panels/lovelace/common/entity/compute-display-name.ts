import type { HassEntity } from "home-assistant-js-websocket";
import { ensureArray } from "../../../../common/array/ensure-array";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import type { EntityNameType } from "../../../../common/translations/entity-state";
import type { HomeAssistant } from "../../../../types";

export const ENTITY_DISPLAY_NAME_TYPES = [
  "entity_name",
  "device_name",
  "area_name",
  "floor_name",
] as const;

export type EntityDisplayNameType = (typeof ENTITY_DISPLAY_NAME_TYPES)[number];

const MAPPING: Record<EntityDisplayNameType, EntityNameType> = {
  entity_name: "entity",
  device_name: "device",
  area_name: "area",
  floor_name: "floor",
};

export const computeEntityDisplayName = (
  hass: HomeAssistant,
  stateObj: HassEntity,
  name?: string | string[]
) => {
  if (!name) {
    return computeStateName(stateObj);
  }

  let names = ensureArray(name);

  // If custom name does not include any of the known types, just join and return
  if (
    !names.some((n) =>
      (ENTITY_DISPLAY_NAME_TYPES as readonly string[]).includes(n)
    )
  ) {
    return names.join(" ");
  }

  const entityUseDeviceName = !computeEntityName(
    stateObj,
    hass.entities,
    hass.devices
  );

  // If entity has no custom name, use device name instead of entity name
  if (entityUseDeviceName) {
    names = names.map((n) => (n === "entity" ? "device" : n));
  }

  // Remove duplicates while preserving order
  names = names.filter((item, pos) => names.indexOf(item) === pos);

  // Fallback to state name (friendly name) if no name could be computed
  return (
    hass.formatEntityName(
      stateObj,
      names.map((n) => MAPPING[n]),
      " "
    ) || computeStateName(stateObj)
  );
};
