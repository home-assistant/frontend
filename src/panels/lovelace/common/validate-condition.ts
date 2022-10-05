import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LinkConditions } from "../components/types";

export interface Condition {
  entity: string;
  state?: string;
  state_not?: string;
}

export function checkConditionsMet(
  linkCondition: LinkConditions,
  conditions: Condition[],
  hass: HomeAssistant
): boolean {
  return linkCondition === "or"
    ? conditions.some((c) => isCondStateApplyingHassState(hass, c))
    : conditions.every((c) => isCondStateApplyingHassState(hass, c));
}

function isCondStateApplyingHassState(hass: HomeAssistant, c: Condition) {
  const state = hass.states[c.entity]
    ? hass!.states[c.entity].state
    : UNAVAILABLE;

  return c.state ? state === c.state : state !== c.state_not;
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every(
    (c) => (c.entity && (c.state || c.state_not)) as unknown as boolean
  );
}
export function validateLinkConditions(
  linkConditions: LinkConditions | undefined
): boolean {
  return (
    linkConditions === undefined ||
    linkConditions === "or" ||
    linkConditions === "and"
  );
}
