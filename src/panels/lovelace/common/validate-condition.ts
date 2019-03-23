import { HomeAssistant } from "../../../types";

export interface Condition {
  entity: string;
  state?: string;
  state_not?: string;
}

export function checkConditionsMet(
  conditions: Condition[],
  hass: HomeAssistant
): boolean {
  return conditions.every((c) => {
    const state = hass.states[c.entity]
      ? hass!.states[c.entity].state
      : "unavailable";

    return c.state ? state === c.state : state !== c.state_not;
  });
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every(
    (c) => ((c.entity && (c.state || c.state_not)) as unknown) as boolean
  );
}
