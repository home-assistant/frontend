import { HassEntity } from "home-assistant-js-websocket";

export const evaluateFilter = (stateObj: HassEntity, filter: any): boolean => {
  const operator = filter.operator ? filter.operator : "==";
  const value = filter.value ? filter.value : filter;
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
      const matches = stateObj.state.match(value) ? true : false;
      return matches;
    }
    default:
      return false;
  }
};
