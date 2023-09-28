import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";

export type Condition = StateCondition | ResponsiveCondition;

export type LegacyCondition = {
  entity?: string;
  state?: string;
  state_not?: string;
};

export type StateCondition = {
  condition: "state";
  entity?: string;
  state?: string;
  state_not?: string;
};

export type ResponsiveCondition = {
  condition: "responsive";
  media_query?: string;
};

function checkStateCondition(condition: StateCondition, hass: HomeAssistant) {
  const state =
    condition.entity && hass.states[condition.entity]
      ? hass.states[condition.entity].state
      : UNAVAILABLE;

  return condition.state != null
    ? state === condition.state
    : state !== condition.state_not;
}

function checkResponsiveCondition(
  condition: ResponsiveCondition,
  _hass: HomeAssistant
) {
  return condition.media_query
    ? matchMedia(condition.media_query).matches
    : false;
}

export function checkConditionsMet(
  conditions: Condition[],
  hass: HomeAssistant
): boolean {
  return conditions.every((c) => {
    if (c.condition === "responsive") {
      return checkResponsiveCondition(c, hass);
    }

    return checkStateCondition(c, hass);
  });
}

function valideStateCondition(condition: StateCondition) {
  return (
    condition.entity != null &&
    (condition.state != null || condition.state_not != null)
  );
}

function valideResponsiveCondition(condition: ResponsiveCondition) {
  return condition.media_query != null;
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every((c) => {
    if (c.condition === "responsive") {
      return valideResponsiveCondition(c);
    }
    return valideStateCondition(c);
  });
}
