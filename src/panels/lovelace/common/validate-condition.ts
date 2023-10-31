import { ensureArray } from "../../../common/array/ensure-array";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";

export type Condition =
  | NumericStateCondition
  | ScreenCondition
  | StateCondition
  | UserCondition;

export type LegacyCondition = {
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
};

export type NumericStateCondition = {
  condition: "numeric_state";
  entity?: string;
  below?: number;
  above?: number;
};

export type StateCondition = {
  condition: "state";
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
};

export type ScreenCondition = {
  condition: "screen";
  media_query?: string;
};

export type UserCondition = {
  condition: "user";
  users?: string[];
};

function checkStateCondition(
  condition: StateCondition | LegacyCondition,
  hass: HomeAssistant
) {
  const state =
    condition.entity && hass.states[condition.entity]
      ? hass.states[condition.entity].state
      : UNAVAILABLE;

  return condition.state != null
    ? ensureArray(condition.state).includes(state)
    : !ensureArray(condition.state_not).includes(state);
}

function checkStateNumericCondition(
  condition: NumericStateCondition,
  hass: HomeAssistant
) {
  const entity =
    (condition.entity ? hass.states[condition.entity] : undefined) ?? undefined;

  if (!entity) {
    return false;
  }

  const numericState = Number(entity.state);

  if (isNaN(numericState)) {
    return false;
  }

  return (
    (condition.above == null || condition.above < numericState) &&
    (condition.below == null || condition.below >= numericState)
  );
}

function checkScreenCondition(condition: ScreenCondition, _: HomeAssistant) {
  return condition.media_query
    ? matchMedia(condition.media_query).matches
    : false;
}

function checkUserCondition(condition: UserCondition, hass: HomeAssistant) {
  return condition.users && hass.user?.id
    ? condition.users.includes(hass.user.id)
    : false;
}

export function checkConditionsMet(
  conditions: (Condition | LegacyCondition)[],
  hass: HomeAssistant
): boolean {
  return conditions.every((c) => {
    if ("condition" in c) {
      switch (c.condition) {
        case "screen":
          return checkScreenCondition(c, hass);
        case "user":
          return checkUserCondition(c, hass);
        case "numeric_state":
          return checkStateNumericCondition(c, hass);
        default:
          return checkStateCondition(c, hass);
      }
    }
    return checkStateCondition(c, hass);
  });
}

function validateStateCondition(condition: StateCondition | LegacyCondition) {
  return (
    condition.entity != null &&
    (condition.state != null || condition.state_not != null)
  );
}

function validateScreenCondition(condition: ScreenCondition) {
  return condition.media_query != null;
}

function validateUserCondition(condition: UserCondition) {
  return condition.users != null;
}

function validateNumericStateCondition(condition: NumericStateCondition) {
  return (
    condition.entity != null &&
    (condition.above != null || condition.below != null)
  );
}

export function validateConditionalConfig(
  conditions: (Condition | LegacyCondition)[]
): boolean {
  return conditions.every((c) => {
    if ("condition" in c) {
      switch (c.condition) {
        case "screen":
          return validateScreenCondition(c);
        case "user":
          return validateUserCondition(c);
        case "numeric_state":
          return validateNumericStateCondition(c);
        default:
          return validateStateCondition(c);
      }
    }
    return validateStateCondition(c);
  });
}
