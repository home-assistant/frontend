import { HomeAssistant } from "../../../types";
import { evaluateFilter } from "./evaluate-filter";

export interface Condition {
  entity: string;
  state?: string;
  state_not?: string;
  operator?: string;
  value?: unknown;
  attribute?: string;
}

export function checkConditionsMet(
  hass: HomeAssistant,
  conditions: Condition[]
): boolean {
  return conditions.every((condition) => {
    const stateObj = hass.states[condition.entity];
    if (!stateObj) {
      return false;
    }

    // for backward compability
    if (!condition.operator) {
      if (condition.state && stateObj.state !== condition.state) {
        return false;
      }
      if (condition.state_not && stateObj.state === condition.state_not) {
        return false;
      }
      return true;
    }

    return evaluateFilter(stateObj, condition);
  });
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every(
    (c) =>
      ((c.entity &&
        (c.state ||
          c.state_not ||
          (c.operator && c.value))) as unknown) as boolean
  );
}
