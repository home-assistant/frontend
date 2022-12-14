import { HassEntity } from "home-assistant-js-websocket";

export const evaluateFilter = (stateObj: HassEntity, filter: any): boolean => {
  const operator = filter.operator || "==";
  let value = filter.value ?? filter;
  let state = filter.attribute
    ? stateObj.attributes[filter.attribute]
    : stateObj.state;

  if (operator === "==" || operator === "!=") {
    const valueIsNumeric =
      typeof value === "number" ||
      (typeof value === "string" &&
        !isNaN(+value) &&
        value.trim().length !== 0);
    const stateIsNumeric =
      typeof state === "number" ||
      (typeof state === "string" &&
        !isNaN(+state) &&
        state.trim().length !== 0);
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
