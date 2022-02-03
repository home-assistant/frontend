import { HomeAssistant } from "../../../types";
import { evaluateFilter, validFilter } from "./evaluate-filter";

export interface Condition {
  entity: string;
  state?: string | string[] | any[];
  state_not?: string | string[];
  state_filter?: Array<{ key: string } | string>;
}

export function checkConditionsMet(
  conditions: Condition[],
  hass: HomeAssistant
): boolean {
  return conditions.every((c) => {
    const stateObj = hass.states[c.entity];
    if (!stateObj) {
      return false;
    }
    if (
      c.state_filter &&
      !c.state_filter.some((f) => evaluateFilter(stateObj, f))
    ) {
      return false;
    }
    if (c.state != null && c.state !== stateObj.state) {
      return false;
    }
    if (c.state_not != null && c.state_not === stateObj.state) {
      return false;
    }
    return true;
  });
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every((c) => {
    if (!c.entity) {
      return false;
    }
    if (c.state != null && typeof c.state !== "string") {
      return false;
    }
    if (c.state_not != null && typeof c.state_not !== "string") {
      return false;
    }
    if (c.state_filter) {
      if (!Array.isArray(c.state_filter)) {
        return false;
      }
      if (!c.state_filter.some((f) => validFilter(f))) {
        return false;
      }
    }
    return true;
  });
}
