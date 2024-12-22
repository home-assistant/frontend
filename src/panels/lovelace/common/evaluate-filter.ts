import { HassEntity } from "home-assistant-js-websocket";

type FilterOperator =
  | "=="
  | "<="
  | "<"
  | ">="
  | ">"
  | "!="
  | "in"
  | "not in"
  | "regex";

// Legacy entity-filter badge & card condition
export type LegacyStateFilter =
  | {
      operator: FilterOperator;
      attribute?: string;
      value: string | number | (string | number)[];
    }
  | number
  | string;

export const evaluateStateFilter = (
  stateObj: HassEntity,
  filter: LegacyStateFilter
): boolean => {
  let operator: FilterOperator;
  let value: string | number | (string | number)[];
  let state: any;

  if (typeof filter === "object") {
    operator = filter.operator;
    value = filter.value;
    state = filter.attribute
      ? stateObj.attributes[filter.attribute]
      : stateObj.state;
  } else {
    operator = "==";
    value = filter;
    state = stateObj.state;
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
        if (Array.isArray(value)) {
          value = value.map((val) => `${val}`);
        }
        return value.includes(state);
      }
      return false;
    case "not in":
      if (Array.isArray(value) || typeof value === "string") {
        if (Array.isArray(value)) {
          value = value.map((val) => `${val}`);
        }
        return !value.includes(state);
      }
      return false;
    case "regex": {
      if (typeof value !== "string") {
        return false;
      }
      if (state !== null && typeof state === "object") {
        return RegExp(value).test(JSON.stringify(state));
      }
      return RegExp(value).test(state);
    }
    default:
      return false;
  }
};
