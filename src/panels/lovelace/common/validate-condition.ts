import { HomeAssistant } from "../../../types";
import { UNAVAILABLE } from "../../../data/entity";

export interface Condition {
  entity?: string;
  state?: string;
  state_not?: string;
  minWidth?: number;
  maxWidth?: number;
}

export function checkConditionsMet(
  conditions: Condition[],
  hass: HomeAssistant
): boolean {
  return conditions.every((c) => {
    if (c.minWidth || c.maxWidth) {
      return c.minWidth
        ? window.matchMedia(`(min-width: ${c.minWidth}px)`).matches
        : true && c.maxWidth
        ? window.matchMedia(`(max-width: ${c.maxWidth}px)`).matches
        : true;
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
        c.minWidth ||
        c.maxWidth) as unknown) as boolean
  );
}
