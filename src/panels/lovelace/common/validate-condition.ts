import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";

export interface Condition {
  entity: string;
  attribute?: string;
  state?: string;
  state_not?: string;
}

export function checkConditionsMet(
  conditions: Condition[],
  hass: HomeAssistant,
): boolean {
  return conditions.every((c) => {
    const entity = hass!.states[c.entity];
    const state = entity
      ? c.attribute
        ? entity.attributes[c.attribute] || UNAVAILABLE
        : entity.state
      : UNAVAILABLE;

    return c.state ? state === c.state : state !== c.state_not;
  });
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every(
    (c) => (c.entity && (c.state || c.state_not)) as unknown as boolean
  );
}
