import { HassEntity } from "home-assistant-js-websocket";
import { HomeAssistant } from "../../../types";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";

export const evaluateFilter = (
  hass: HomeAssistant,
  current_entity_id: string,
  filter: any
): boolean => {
  const stateObj: HassEntity = hass.states[current_entity_id];

  if (!stateObj) {
    return false;
  }

  const operator = filter.operator || "==";
  let value = filter.value ?? filter;
  let state = filter.attribute
    ? stateObj.attributes[filter.attribute]
    : stateObj.state;

  if (
    typeof value === "string" &&
    isValidEntityId(value) &&
    hass.states[value]
  ) {
    value = hass.states[value]?.state;
  }

  if (operator === "==" || operator === "!=") {
    const valueIsNumeric =
      typeof value === "number" ||
      (typeof value === "string" && value.trim() && !isNaN(Number(value)));
    const stateIsNumeric =
      typeof state === "number" ||
      (typeof state === "string" && state.trim() && !isNaN(Number(state)));
    if (valueIsNumeric && stateIsNumeric) {
      value = Number(value);
      state = Number(state);
    }
  }

  switch (operator) {
    case "==":
      return state === value;
    case "<=":
      return state <= value;
    case "<":
      return state < value;
    case ">=":
      return state >= value;
    case ">":
      return state > value;
    case "!=":
      return state !== value;
    case "in":
      if (Array.isArray(value) || typeof value === "string") {
        return value.includes(state);
      }
      return false;
    case "not in":
      if (Array.isArray(value) || typeof value === "string") {
        return !value.includes(state);
      }
      return false;
    case "regex": {
      if (state !== null && typeof state === "object") {
        return RegExp(value).test(JSON.stringify(state));
      }
      return RegExp(value).test(state);
    }
    default:
      return false;
  }
};
