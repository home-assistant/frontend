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
    if (!(c.entity in hass.states)) {
      return false;
    }
    if (c.state) {
      return hass.states[c.entity].state === c.state;
    }
    return hass!.states[c.entity].state !== c.state_not;
  });
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every(
    (c) => ((c.entity && (c.state || c.state_not)) as unknown) as boolean
  );
}
