import type { HassEntity } from "home-assistant-js-websocket";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import type { EntityNameType } from "../../../../common/translations/entity-state";
import type { HomeAssistant } from "../../../../types";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { ensureArray } from "../../../../common/array/ensure-array";

export const computeEntityDisplayName = (
  hass: HomeAssistant,
  stateObj: HassEntity,
  name?: EntityNameType | EntityNameType[]
) => {
  const names = ensureArray(name);

  if (!name) {
    return computeStateName(stateObj);
  }

  const entityUseDeviceName = !!computeEntityName(
    stateObj,
    hass.entities,
    hass.devices
  );

  // If entity uses device name, and "device" is not explicitly requested,
  // replace "entity" with "device" in the list of names to compute.
  // This ensures that we don't show both the device name and entity name
  // when they are the same.
  if (entityUseDeviceName && !names.includes("device")) {
    names.map((n) => (n === "entity" ? "device" : n));
  }

  // Fallback to state name (friendly name) if no name could be computed
  return (
    hass.formatEntityName(stateObj, names, " · ") || computeStateName(stateObj)
  );
};
