import { HassEntity } from "home-assistant-js-websocket";

export const evaluateFilter = (stateObj: HassEntity, filter: any): boolean => {
  const operator = filter.operator || "==";
  const value = filter.value ?? filter;
  const state = filter.attribute
    ? stateObj.attributes[filter.attribute]
    : stateObj.state;

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
