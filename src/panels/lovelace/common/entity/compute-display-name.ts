import type { HassEntity } from "home-assistant-js-websocket";
import { ensureArray } from "../../../../common/array/ensure-array";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import type { EntityNameType } from "../../../../common/translations/entity-state";
import type { HomeAssistant } from "../../../../types";

export const computeEntityDisplayName = (
  hass: HomeAssistant,
  stateObj: HassEntity,
  name?: EntityNameType | EntityNameType[]
) => {
  let names = ensureArray(name);

  if (!name) {
    return computeStateName(stateObj);
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
    hass.formatEntityName(stateObj, names, " · ") || computeStateName(stateObj)
  );
};
