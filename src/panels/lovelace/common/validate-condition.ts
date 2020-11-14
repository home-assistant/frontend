import { HomeAssistant } from "../../../types";

export interface Condition {
  entity: string;
  attribute?: string;
  state?: string;
  state_not?: string;
  above?: any;
  below?: any;
}

export function checkConditionsMet(
  conditions: Condition[],
  hass: HomeAssistant
): boolean {
  return conditions.every((condition) => {
    const stateObj = hass.states[condition.entity];
    if (!stateObj) {
      return false;
    }

    const state = condition.attribute
      ? stateObj.attributes[condition.attribute]
      : stateObj.state;

    if (condition.state && state !== condition.state) {
      return false;
    }
    if (condition.state_not && state === condition.state_not) {
      return false;
    }
    if (condition.above != null && state <= condition.above) {
      return false;
    }
    if (condition.below != null && state >= condition.below) {
      return false;
    }
    return true;
  });
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every(
    (c) =>
      ((c.entity &&
        (c.state ||
          c.state_not ||
          c.above != null ||
          c.below != null)) as unknown) as boolean
  );
}
