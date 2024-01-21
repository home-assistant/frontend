import { HassEntity } from "home-assistant-js-websocket";
import { HomeAssistant } from "../../../types";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";

type ConditionOperator =
  | "=="
  | "<="
  | "<"
  | ">="
  | ">"
  | "!="
  | "in"
  | "not in"
  | "regex";

interface BaseCondition {
  condition: string;
  attribute?: string;
}

export interface OperatorCondition extends BaseCondition {
  condition: "operator";
  operator: ConditionOperator;
  value: string | number;
}

export interface StateCondition extends BaseCondition {
  condition: "state";
  state?: string | number | string[];
  state_not?: string | number | string[];
}

export interface NumericStateCondition extends BaseCondition {
  condition: "numeric_state";
  above?: number;
  below?: number;
}

export type Condition =
  | OperatorCondition
  | StateCondition
  | NumericStateCondition;

export const evaluateFilter = (
  hass: HomeAssistant,
  current_entity_id: string,
  filterInput: Condition | string | number
): boolean => {
  const currentEntity: HassEntity = hass.states[current_entity_id];

  if (!currentEntity) {
    return false;
  }

  let filter: Condition;
  if (typeof filterInput === "string" || typeof filterInput === "number") {
    filter = {
      condition: "state",
      state: filterInput,
    };
  } else {
    filter = filterInput;
  }

  let filterValue: string | number | string[] | undefined; // value that will be compare to the entity state
  let filterOperator: ConditionOperator = "=="; // operation that the filter will apply to the state against the value
  let currentEntityState: string | number = filter.attribute // state of the entity to filter on
    ? currentEntity.attributes[filter.attribute]
    : currentEntity.state;

  // retro compatibility when only filterOperator filter exists
  if ((filter as any)?.operator !== undefined) {
    filter.condition = "operator";
  }

  switch (filter.condition) {
    // OperatorCondition
    case "operator":
      filterOperator = filter.operator || "==";
      filterValue = filter.value ?? filter;
      break;

    // StateCondition
    case "state":
      if (filter.state) {
        filterValue = filter.state;
        filterOperator = Array.isArray(filterValue) ? "in" : "==";
      } else if (filter.state_not) {
        filterValue = filter.state_not;
        filterOperator = Array.isArray(filterValue) ? "not in" : "!=";
      }
      break;

    // NumericStateCondition
    case "numeric_state":
      if (filter.above) {
        filterValue = filter.above;
        filterOperator = ">";
      } else if (filter.below) {
        filterValue = filter.below;
        filterOperator = "<";
      }
      break;
  }

  if (
    typeof filterValue === "string" &&
    isValidEntityId(filterValue) &&
    hass.states[filterValue] !== undefined
  ) {
    filterValue = hass.states[filterValue]?.state;
  }

  if (filterValue === undefined) {
    return false;
  }

  if (filterOperator === "==" || filterOperator === "!=") {
    const valueIsNumeric =
      typeof filterValue === "number" ||
      (typeof filterValue === "string" &&
        filterValue.trim() &&
        !isNaN(Number(filterValue)));
    const stateIsNumeric =
      typeof currentEntityState === "number" ||
      (typeof currentEntityState === "string" &&
        currentEntityState.trim() &&
        !isNaN(Number(currentEntityState)));
    if (valueIsNumeric && stateIsNumeric) {
      filterValue = Number(filterValue);
      currentEntityState = Number(currentEntityState);
    }
  }

  switch (filterOperator) {
    case "==":
      return currentEntityState === filterValue;
    case "<=":
      return currentEntityState <= filterValue;
    case "<":
      return currentEntityState < filterValue;
    case ">=":
      return currentEntityState >= filterValue;
    case ">":
      return currentEntityState > filterValue;
    case "!=":
      return currentEntityState !== filterValue;
    case "in":
      if (Array.isArray(filterValue) || typeof filterValue === "string") {
        return filterValue.includes(`${currentEntityState}`);
      }
      return false;
    case "not in":
      if (Array.isArray(filterValue) || typeof filterValue === "string") {
        return !filterValue.includes(`${currentEntityState}`);
      }
      return false;
    case "regex": {
      if (
        currentEntityState !== null &&
        typeof currentEntityState === "object"
      ) {
        return RegExp(`${filterValue}`).test(
          JSON.stringify(currentEntityState)
        );
      }
      return RegExp(`${filterValue}`).test(`${currentEntityState}`);
    }
    default:
      return false;
  }
};
