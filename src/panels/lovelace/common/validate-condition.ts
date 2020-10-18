import { HomeAssistant } from "../../../types";
import { UNAVAILABLE } from "../../../data/entity";

export interface Condition {
  entity: string;
  state?: string;
  state_not?: string;
  value?: string;
  operator?: string;
}

export function checkConditionsMet(
  conditions: Condition[],
  hass: HomeAssistant
): boolean {
  return conditions.every((c) => {
    const state = hass.states[c.entity]
      ? hass!.states[c.entity].state
      : UNAVAILABLE;
    if (!c.operator) {
      if (c.state && state !== c.state) {
        return false;
      }
      if (c.state_not && state === c.state_not) {
        return false;
      }
      return true;
    }

    if (!c.value) {
      // error state must be defined when operator is defined too
      return false;
    }

    if (c.operator === "==") {
      return state === c.value;
    }
    if (c.operator === "!=") {
      return state !== c.value;
    }
    if (c.operator === ">") {
      return Number(state) > Number(c.value);
    }
    if (c.operator === "<") {
      return Number(state) < Number(c.value);
    }
    if (c.operator === ">=") {
      return Number(state) >= Number(c.value);
    }
    if (c.operator === "<=") {
      return Number(state) <= Number(c.value);
    }
    // unknown operator
    return false;
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
