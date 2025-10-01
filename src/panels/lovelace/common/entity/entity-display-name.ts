import type { HassEntity } from "home-assistant-js-websocket";
import { ensureArray } from "../../../../common/array/ensure-array";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import type { EntityNameType } from "../../../../common/translations/entity-state";
import type { HomeAssistant } from "../../../../types";

interface TextName {
  type: "text";
  text: string;
}

interface ContextType {
  type: EntityNameType;
}

export type EntityNameObject = TextName | ContextType;

export const ensureEntityNameObject = (
  name: EntityNameConfig
): EntityNameObject =>
  typeof name === "string" ? { type: "text", text: name } : name;

export type EntityNameConfig = EntityNameObject | string;

export const formatEntityDisplayName = (
  hass: HomeAssistant,
  stateObj: HassEntity,
  name?: EntityNameConfig | EntityNameConfig[]
) => {
  if (typeof name === "string") {
    return name;
  }
  if (!name) {
    return computeStateName(stateObj);
  }

  let names = ensureArray(name).map(ensureEntityNameObject);

  // If custom name does not include any of the known types, just join and return
  if (!names.some((n) => n.type !== "text")) {
    return names.join(" ");
  }

  const entityUseDeviceName = !computeEntityName(
    stateObj,
    hass.entities,
    hass.devices
  );

  // If entity has no custom name, use device name instead of entity name
  if (entityUseDeviceName) {
    names = names.map((n) => (n.type === "entity" ? { type: "device" } : n));
  }

  // Remove duplicates type while preserving order (only if they are known types)
  if (names.length > 1) {
    names = names.filter(
      (n, i) =>
        !(n.type !== "text" && names.findIndex((t) => t.type === n.type) < i)
    );
  }

  const formattedName = names
    .map((n) =>
      n.type === "text" ? n.text : hass.formatEntityName(stateObj, n.type)
    )
    .filter((n) => n)
    .join(" ");

  // Fallback to state name (friendly name) if no name could be computed
  return formattedName || computeStateName(stateObj);
};
