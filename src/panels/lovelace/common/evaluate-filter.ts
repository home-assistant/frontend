import { HassEntity } from "home-assistant-js-websocket";

export const evaluateFilter = (stateObj: HassEntity, filter: any): boolean => {
  const operator = filter.operator || "==";
  const value = filter.value || filter;
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
      if (Array.isArray(state) || typeof state === typeof "string") {
        return state.includes(value);
      }
      return false;
    case "not in":
      if (Array.isArray(state) || typeof state === typeof "string") {
        return !state.includes(value);
      }
      return false;
    case "regex": {
      if (
        typeof state !== typeof "string" &&
        typeof state !== typeof 1 &&
        typeof state !== typeof true &&
        state !== null &&
        typeof state !== typeof undefined
      ) {
        return (JSON.stringify(state) as any).match(value);
      }
      return state.match(value);
    }
    default:
      return false;
  }
};
