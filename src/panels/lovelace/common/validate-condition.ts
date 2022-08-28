import { UNAVAILABLE, UNKNOWN } from "../../../data/entity";
import { HomeAssistant } from "../../../types";

export interface Condition {
  entity: string;
  attribute?: string;
  state?: string;
  state_not?: string;
}

export function checkConditionsMet(
  conditions: Condition[],
  hass: HomeAssistant
): boolean {
  return conditions.every((c) => {
    let state: string;

    if (!hass.states[c.entity]) {
      state = UNAVAILABLE;
    }

    if (c.attribute) {
      state = hass!.states[c.entity].attributes[c.attribute]
        ? hass!.states[c.entity].attributes[c.attribute]
        : UNKNOWN;
    } else {
      state = hass!.states[c.entity].state;
    }

    return c.state ? state === c.state : state !== c.state_not;
  });
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every(
    (c) => (c.entity && (c.state || c.state_not)) as unknown as boolean
  );
}
