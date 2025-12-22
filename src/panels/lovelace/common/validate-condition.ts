import { ensureArray } from "../../../common/array/ensure-array";
import {
  checkTimeInRange,
  isValidTimeString,
} from "../../../common/datetime/check_time";
import {
  WEEKDAYS_SHORT,
  type WeekdayShort,
} from "../../../common/datetime/weekday";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { UNKNOWN } from "../../../data/entity/entity";
import { getUserPerson } from "../../../data/person";
import type { HomeAssistant } from "../../../types";

export type Condition =
  | LocationCondition
  | NumericStateCondition
  | StateCondition
  | ScreenCondition
  | TimeCondition
  | UserCondition
  | OrCondition
  | AndCondition
  | NotCondition;

// Legacy conditional card condition
export interface LegacyCondition {
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
}

interface BaseCondition {
  condition: string;
}

export interface LocationCondition extends BaseCondition {
  condition: "location";
  locations?: string[];
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
  state?: string | string[];
  state_not?: string | string[];
}

export interface ScreenCondition extends BaseCondition {
  condition: "screen";
  media_query?: string;
}

export interface TimeCondition extends BaseCondition {
  condition: "time";
  after?: string;
  before?: string;
  weekdays?: WeekdayShort[];
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

export interface NotCondition extends BaseCondition {
  condition: "not";
  conditions?: Condition[];
}

function getValueFromEntityId(
  hass: HomeAssistant,
  value: string
): string | undefined {
  if (isValidEntityId(value) && hass.states[value]) {
    return hass.states[value]?.state;
  }
  return undefined;
}

function checkStateCondition(
  condition: StateCondition | LegacyCondition,
  hass: HomeAssistant
) {
  const state =
    condition.entity && hass.states[condition.entity]
      ? hass.states[condition.entity].state
      : UNKNOWN;
  let value = condition.state ?? condition.state_not;

  // Handle entity_id, UI should be updated for conditional card (filters does not have UI for now)
  if (Array.isArray(value)) {
    const entityValues = value
      .map((v) => getValueFromEntityId(hass, v))
      .filter((v): v is string => v !== undefined);
    value = [...value, ...entityValues];
  } else if (typeof value === "string") {
    const entityValue = getValueFromEntityId(hass, value);
    value = [value];
    if (entityValue) {
      value.push(entityValue);
    }
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

  // Handle entity_id, UI should be updated for conditional card (filters does not have UI for now)
  if (typeof above === "string") {
    above = getValueFromEntityId(hass, above) ?? above;
  }
  if (typeof below === "string") {
    below = getValueFromEntityId(hass, below) ?? below;
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

function checkTimeCondition(
  condition: Omit<TimeCondition, "condition">,
  hass: HomeAssistant
) {
  return checkTimeInRange(hass, condition);
}

function checkLocationCondition(
  condition: LocationCondition,
  hass: HomeAssistant
) {
  const stateObj = getUserPerson(hass);
  if (!stateObj) {
    return false;
  }
  return condition.locations?.includes(stateObj.state);
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

function checkNotCondition(condition: NotCondition, hass: HomeAssistant) {
  if (!condition.conditions) return true;
  return !checkConditionsMet(condition.conditions, hass);
}

function checkOrCondition(condition: OrCondition, hass: HomeAssistant) {
  if (!condition.conditions) return true;
  return condition.conditions.some((c) => checkConditionsMet([c], hass));
}

/**
 * Return the result of applying conditions
 * @param conditions conditions to apply
 * @param hass Home Assistant object
 * @returns true if conditions are respected
 */
export function checkConditionsMet(
  conditions: (Condition | LegacyCondition)[],
  hass: HomeAssistant
): boolean {
  return conditions.every((c) => {
    if ("condition" in c) {
      switch (c.condition) {
        case "time":
          return checkTimeCondition(c, hass);
        case "screen":
          return checkScreenCondition(c, hass);
        case "user":
          return checkUserCondition(c, hass);
        case "location":
          return checkLocationCondition(c, hass);
        case "numeric_state":
          return checkStateNumericCondition(c, hass);
        case "and":
          return checkAndCondition(c, hass);
        case "not":
          return checkNotCondition(c, hass);
        case "or":
          return checkOrCondition(c, hass);
        default:
          return checkStateCondition(c, hass);
      }
    }
    return checkStateCondition(c, hass);
  });
}

export function extractConditionEntityIds(
  conditions: Condition[]
): Set<string> {
  const entityIds = new Set<string>();
  for (const condition of conditions) {
    if (condition.condition === "numeric_state") {
      if (condition.entity) {
        entityIds.add(condition.entity);
      }
      if (
        typeof condition.above === "string" &&
        isValidEntityId(condition.above)
      ) {
        entityIds.add(condition.above);
      }
      if (
        typeof condition.below === "string" &&
        isValidEntityId(condition.below)
      ) {
        entityIds.add(condition.below);
      }
    } else if (condition.condition === "state") {
      if (condition.entity) {
        entityIds.add(condition.entity);
      }
      [
        ...(ensureArray(condition.state) ?? []),
        ...(ensureArray(condition.state_not) ?? []),
      ].forEach((state) => {
        if (!!state && isValidEntityId(state)) {
          entityIds.add(state);
        }
      });
    } else if ("conditions" in condition && condition.conditions) {
      return new Set([
        ...entityIds,
        ...extractConditionEntityIds(condition.conditions),
      ]);
    }
  }
  return entityIds;
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

function validateTimeCondition(condition: TimeCondition) {
  // Check if time strings are present and non-empty
  const hasAfter = condition.after != null && condition.after !== "";
  const hasBefore = condition.before != null && condition.before !== "";
  const hasTime = hasAfter || hasBefore;

  const hasWeekdays =
    condition.weekdays != null && condition.weekdays.length > 0;
  const weekdaysValid =
    !hasWeekdays ||
    condition.weekdays!.every((w: WeekdayShort) => WEEKDAYS_SHORT.includes(w));

  // Validate time string formats if present
  const timeStringsValid =
    (!hasAfter || isValidTimeString(condition.after!)) &&
    (!hasBefore || isValidTimeString(condition.before!));

  // Prevent after and before being identical (creates zero-length interval)
  const timeRangeValid =
    !hasAfter || !hasBefore || condition.after !== condition.before;

  return (
    (hasTime || hasWeekdays) &&
    weekdaysValid &&
    timeStringsValid &&
    timeRangeValid
  );
}

function validateUserCondition(condition: UserCondition) {
  return condition.users != null;
}

function validateLocationCondition(condition: LocationCondition) {
  return condition.locations != null;
}

function validateAndCondition(condition: AndCondition) {
  return condition.conditions != null;
}

function validateNotCondition(condition: NotCondition) {
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
        case "time":
          return validateTimeCondition(c);
        case "user":
          return validateUserCondition(c);
        case "location":
          return validateLocationCondition(c);
        case "numeric_state":
          return validateNumericStateCondition(c);
        case "and":
          return validateAndCondition(c);
        case "not":
          return validateNotCondition(c);
        case "or":
          return validateOrCondition(c);
        default:
          return validateStateCondition(c);
      }
    }
    return validateStateCondition(c);
  });
}

/**
 * Build a condition for filters
 * @param condition condition to apply
 * @param entityId base the condition on that entity
 * @returns a new condition with entity id
 */
export function addEntityToCondition(
  condition: Condition,
  entityId: string
): Condition {
  if ("conditions" in condition && condition.conditions) {
    return {
      ...condition,
      conditions: condition.conditions.map((c) =>
        addEntityToCondition(c, entityId)
      ),
    };
  }

  if (
    condition.condition === "state" ||
    condition.condition === "numeric_state"
  ) {
    return {
      entity: entityId,
      ...condition,
    };
  }
  return condition;
}
