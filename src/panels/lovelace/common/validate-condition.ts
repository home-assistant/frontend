import { HomeAssistant } from "../../../types";
import { UNAVAILABLE } from "../../../data/entity";

export interface Condition {
  entity?: string;
  state?: string;
  state_not?: string;
  user?: string;
  user_not?: string;
}

export function checkConditionsMet(
  conditions: Condition[],
  hass: HomeAssistant
): boolean {
  return conditions.every((c) => {
    if (c.user || c.user_not) {
      return c.user ? hass.user!.id === c.user : hass.user!.id !== c.user_not;
    }

    const state = hass.states[c.entity!]
      ? hass!.states[c.entity!].state
      : UNAVAILABLE;

    return c.state ? state === c.state : state !== c.state_not;
  });
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every(
    (c) =>
      (((c.entity && (c.state || c.state_not)) ||
        c.user ||
        c.user_not) as unknown) as boolean
  );
}
