import { HassEntity } from "home-assistant-js-websocket";
import { ensureArray } from "../../../common/array/ensure-array";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";

export type Condition =
  | NumericStateCondition
  | StateCondition
  | ScreenCondition
  | UserCondition
  | OrCondition
  | AndCondition;

// Legacy conditional card condition
export interface LegacyCondition {
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
}

type FilterOperator =
  | "=="
  | "<="
  | "<"
  | ">="
  | ">"
  | "!="
  | "in"
  | "not in"
  | "regex";

// Legacy entity-filter badge & card condition
export interface LegacyFilterCondition {
  operator: FilterOperator;
  entity?: string | number;
  attribute?: string;
  value: string | number | string[];
}

interface BaseCondition {
  condition: string;
}

export interface NumericStateCondition extends BaseCondition {
  condition: "numeric_state";
  entity?: string;
  below?: string | number;
  above?: string | number;
}

export interface StateCondition extends BaseCondition {
  condition: "state";
  entity?: string;
  state?: string | number | string[];
  state_not?: string | number | string[];
}

export interface ScreenCondition extends BaseCondition {
  condition: "screen";
  media_query?: string;
}

export interface UserCondition extends BaseCondition {
  condition: "user";
  users?: string[];
}

export interface OrCondition extends BaseCondition {
  condition: "or";
  conditions?: Condition[];
}

export interface AndCondition extends BaseCondition {
  condition: "and";
  conditions?: Condition[];
}

function getValueFromEntityId(
  hass: HomeAssistant,
  value: string | string[]
): string | string[] {
  let returned: string | string[];
  if (
    typeof value === "string" &&
    isValidEntityId(value) &&
    hass.states[value]
  ) {
    returned = hass.states[value]?.state;
  } else if (Array.isArray(value)) {
    returned = value.map((v) => getValueFromEntityId(hass, v) as string);
  } else {
    returned = value;
  }
  return returned;
}

function checkLegacyFilterCondition(
  condition: LegacyFilterCondition,
  hass: HomeAssistant
) {
  const entity: HassEntity = hass.states[condition.entity!];

  if (!entity) {
    return false;
  }
  let value = condition.value;
  let state = condition.attribute
    ? entity.attributes[condition.attribute]
    : entity.state;

  if (Array.isArray(value) || typeof value === "string") {
    value = getValueFromEntityId(hass, value);
  }

  if (condition.operator === "==" || condition.operator === "!=") {
    const valueIsNumeric =
      typeof value === "number" ||
      (typeof value === "string" && value.trim() && !isNaN(Number(value)));
    const stateIsNumeric =
      typeof state === "number" ||
      (typeof state === "string" && state.trim() && !isNaN(Number(state)));
    if (valueIsNumeric && stateIsNumeric) {
      value = Number(value);
      state = Number(state);
    }
  }

  switch (condition.operator) {
    case "==":
      return state === value;
    case "<=":
      return state <= value;
    case "<":
      return state < value;
    case ">=":
      return state >= value;
    case ">":
      return state > value;
    case "!=":
      return state !== value;
    case "in":
      if (Array.isArray(value) || typeof value === "string") {
        return value.includes(`${state}`);
      }
      return false;
    case "not in":
      if (Array.isArray(value) || typeof value === "string") {
        return !value.includes(`${state}`);
      }
      return false;
    case "regex": {
      if (state !== null && typeof state === "object") {
        return RegExp(`${value}`).test(JSON.stringify(state));
      }
      return RegExp(`${value}`).test(`${state}`);
    }
    default:
      return false;
  }
}

function checkStateCondition(
  condition: StateCondition | LegacyCondition,
  hass: HomeAssistant
) {
  const state =
    condition.entity && hass.states[condition.entity]
      ? hass.states[condition.entity].state
      : UNAVAILABLE;
  let value = condition.state ?? condition.state_not;

  // Handle entity_id, UI should be updated for conditionnal card (filters does not have UI for now)
  if (Array.isArray(value) || typeof value === "string") {
    value = getValueFromEntityId(hass, value);
  }

  return condition.state != null
    ? ensureArray(value).includes(state)
    : !ensureArray(value).includes(state);
}

function checkStateNumericCondition(
  condition: NumericStateCondition,
  hass: HomeAssistant
) {
  const state = (condition.entity ? hass.states[condition.entity] : undefined)
    ?.state;
  let above = condition.above;
  let below = condition.below;

  // Handle entity_id, UI should be updated for conditionnal card (filters does not have UI for now)
  if (typeof above === "string") {
    above = getValueFromEntityId(hass, above) as string;
  }
  if (typeof below === "string") {
    below = getValueFromEntityId(hass, below) as string;
  }

  const numericState = Number(state);
  const numericAbove = Number(above);
  const numericBelow = Number(below);

  if (isNaN(numericState)) {
    return false;
  }

  return (
    (condition.above == null ||
      isNaN(numericAbove) ||
      numericAbove < numericState) &&
    (condition.below == null ||
      isNaN(numericBelow) ||
      numericBelow > numericState)
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

function checkAndCondition(condition: AndCondition, hass: HomeAssistant) {
  if (!condition.conditions) return true;
  return checkConditionsMet(condition.conditions, hass);
}

function checkOrCondition(condition: OrCondition, hass: HomeAssistant) {
  if (!condition.conditions) return true;
  return condition.conditions.some((c) => checkConditionsMet([c], hass));
}

/**
 * Build a condition for filters
 * @param condition condition to apply
 * @param entityId base the condition on that entity (current entity to filter)
 * @returns a new condition that handled legacy filter conditions
 */
export function buildConditionForFilter(
  condition: Condition | LegacyFilterCondition | string | number,
  entityId: string
): Condition | LegacyFilterCondition {
  let newCondition: Condition | LegacyFilterCondition;

  if (typeof condition === "string" || typeof condition === "number") {
    newCondition = {
      condition: "state",
      state: condition,
    } as StateCondition;
  } else {
    newCondition = condition;
  }

  // Set the entity to filter on
  if (
    ("condition" in newCondition &&
      (newCondition.condition === "numeric_state" ||
        newCondition.condition === "state")) ||
    "operator" in newCondition
  ) {
    newCondition.entity = entityId;
  }

  return newCondition;
}

/**
 * Return the result of applying conditions
 * @param conditions conditions to apply
 * @param hass Home Assistant object
 * @returns true if conditions are respected
 */
export function checkConditionsMet(
  conditions: (Condition | LegacyCondition | LegacyFilterCondition)[],
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
        case "and":
          return checkAndCondition(c, hass);
        case "or":
          return checkOrCondition(c, hass);
        default:
          return checkStateCondition(c, hass);
      }
    } else if ("operator" in c) {
      return checkLegacyFilterCondition(c, hass);
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

function validateAndCondition(condition: AndCondition) {
  return condition.conditions != null;
}

function validateOrCondition(condition: OrCondition) {
  return condition.conditions != null;
}

function validateNumericStateCondition(condition: NumericStateCondition) {
  return (
    condition.entity != null &&
    (condition.above != null || condition.below != null)
  );
}
/**
 * Validate the conditions config for the UI
 * @param conditions conditions to apply
 * @returns true if conditions are validated
 */
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
        case "and":
          return validateAndCondition(c);
        case "or":
          return validateOrCondition(c);
        default:
          return validateStateCondition(c);
      }
    }
    return validateStateCondition(c);
  });
}
