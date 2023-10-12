import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";

export type Condition = StateCondition | ScreenCondition;

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

export type ScreenCondition = {
  condition: "screen";
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

function checkScreenCondition(
  condition: ScreenCondition,
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
    if (c.condition === "screen") {
      return checkScreenCondition(c, hass);
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

function validateScreenCondition(condition: ScreenCondition) {
  return condition.media_query != null;
}

export function validateConditionalConfig(conditions: Condition[]): boolean {
  return conditions.every((c) => {
    if (c.condition === "screen") {
      return validateScreenCondition(c);
    }
    return valideStateCondition(c);
  });
}
