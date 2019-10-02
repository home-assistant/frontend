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
    case "regex": {
      return state.match(value);
    }
    default:
      return false;
  }
};
