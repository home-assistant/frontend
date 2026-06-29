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
import type {
  NumericStateCondition as CoreNumericStateCondition,
  PlatformCondition as CorePlatformCondition,
  StateCondition as CoreStateCondition,
  SunCondition,
  TemplateCondition,
  ZoneCondition,
} from "../../../data/automation";
import type { DeviceCondition } from "../../../data/device/device_automation";
import { UNKNOWN } from "../../../data/entity/entity";
import { getUserPerson } from "../../../data/person";
import type { HomeAssistant } from "../../../types";

export type Condition =
  | ViewColumnsCondition
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

export interface ConditionContext {
  max_columns?: number;
  entity_id?: string;
}

export interface ViewColumnsCondition extends BaseCondition {
  condition: "view_columns";
  min?: number;
  max?: number;
}

export interface LocationCondition extends BaseCondition {
  condition: "location";
  locations?: string[];
}

export interface NumericStateCondition extends BaseCondition {
  condition: "numeric_state";
  entity?: string;
  attribute?: string;
  below?: string | number;
  above?: string | number;
}

export interface StateCondition extends BaseCondition {
  condition: "state";
  entity?: string;
  attribute?: string;
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

/**
 * Dashboard visibility conditions
 * ===============================
 *
 * Historically, dashboard visibility (`visibility` on cards/badges/sections/
 * views and `conditions` on the conditional card/row/element) used the
 * lovelace-only {@link Condition} format above, evaluated synchronously on the
 * client by {@link checkConditionsMet}.
 *
 * We are moving the *evaluation* of stateful conditions to core (see
 * https://github.com/home-assistant/frontend/issues/52836). The visibility
 * format therefore becomes the union of:
 *
 * - the **client-only** lovelace conditions that have no usable core
 *   equivalent for dashboards — `screen`, `user`, `view_columns`, `location`,
 *   and `time` (evaluated against the viewer's local context); and
 * - any **core** automation condition (`state`, `numeric_state`, `template`,
 *   `sun`, `zone`, `device`, and integration-provided conditions), which is
 *   evaluated server-side through `subscribe_condition`.
 *
 * The two may be mixed freely, including inside `and` / `or` / `not`.
 *
 * Back-compat is **read both / write new**: existing dashboards keep their
 * lovelace-format `state` / `numeric_state` conditions (`entity`, `state_not`,
 * …) and are translated to core format on the fly (see
 * `common/condition/translate.ts`); only conditions the user edits and saves
 * are persisted in core format.
 *
 * Note: lovelace `state` / `numeric_state` use `entity`, while their core
 * counterparts use `entity_id`. Both shapes coexist in this union and are
 * disambiguated by that field — centralized in `common/condition/translate.ts`.
 */
export type VisibilityCondition =
  // Client-only lovelace conditions (no core equivalent for dashboards)
  | ScreenCondition
  | UserCondition
  | ViewColumnsCondition
  | LocationCondition
  | TimeCondition
  // Lovelace stateful conditions (read-both back-compat; `entity`-based)
  | StateCondition
  | NumericStateCondition
  | LegacyCondition
  // Core automation conditions (server-evaluated; `entity_id`-based)
  | CoreVisibilityCondition
  // Logical combinators over the mixed union
  | VisibilityLogicalCondition;

/**
 * Core automation conditions usable for dashboard visibility, evaluated
 * server-side. Mirrors `data/automation`'s condition types, minus the ones
 * kept client-side by decision (`time`) and the ones with no dashboard meaning
 * (`trigger`). The `PlatformCondition` member covers integration-provided
 * conditions and, being a `condition: string` catch-all, also subsumes the
 * already-core `state` / `numeric_state` shapes.
 */
export type CoreVisibilityCondition =
  | CoreStateCondition
  | CoreNumericStateCondition
  | SunCondition
  | ZoneCondition
  | TemplateCondition
  | DeviceCondition
  | CorePlatformCondition;

/** `and` / `or` / `not` combinator whose children are the mixed union. */
export interface VisibilityLogicalCondition extends BaseCondition {
  condition: "and" | "or" | "not";
  conditions?: VisibilityCondition[];
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
  hass: HomeAssistant,
  context: ConditionContext
) {
  // A core-format condition carries its own `entity_id`; prefer it over the
  // lovelace `entity` and the host's context entity so the optimistic seed
  // targets the same entity the server-side subscription does.
  const entityId =
    ("entity_id" in condition
      ? (condition as { entity_id?: string }).entity_id
      : undefined) ||
    condition.entity ||
    context.entity_id;
  const stateObj = entityId ? hass.states[entityId] : undefined;
  const attribute = "attribute" in condition ? condition.attribute : undefined;
  let state: string;
  if (!stateObj) {
    state = UNKNOWN;
  } else if (attribute) {
    const attrValue = stateObj.attributes[attribute];
    state = attrValue == null ? UNKNOWN : String(attrValue);
  } else {
    state = stateObj.state;
  }
  let value = condition.state ?? condition.state_not;

  // Guard against invalid/incomplete condition configuration
  if (value === undefined) {
    return false;
  }

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
  hass: HomeAssistant,
  context: ConditionContext
) {
  // See checkStateCondition: prefer a core-format `entity_id` over the lovelace
  // `entity` and the host's context entity.
  const entityId =
    ("entity_id" in condition
      ? (condition as { entity_id?: string }).entity_id
      : undefined) ||
    condition.entity ||
    context.entity_id;
  const stateObj = entityId ? hass.states[entityId] : undefined;
  const state = condition.attribute
    ? stateObj?.attributes[condition.attribute]
    : stateObj?.state;
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

function checkViewColumnsCondition(
  condition: ViewColumnsCondition,
  context: ConditionContext
) {
  if (!context.max_columns) return true;
  return (
    (condition.min == null || context.max_columns >= condition.min) &&
    (condition.max == null || context.max_columns <= condition.max)
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

function checkAndCondition(
  condition: AndCondition,
  hass: HomeAssistant,
  context: ConditionContext
) {
  if (!condition.conditions) return true;
  return checkConditionsMet(condition.conditions, hass, context);
}

function checkNotCondition(
  condition: NotCondition,
  hass: HomeAssistant,
  context: ConditionContext
) {
  if (!condition.conditions) return true;
  return !checkConditionsMet(condition.conditions, hass, context);
}

function checkOrCondition(
  condition: OrCondition,
  hass: HomeAssistant,
  context: ConditionContext
) {
  if (!condition.conditions) return true;
  return condition.conditions.some((c) =>
    checkConditionsMet([c], hass, context)
  );
}

/**
 * Return the result of applying conditions
 * @param conditions conditions to apply
 * @param hass Home Assistant object
 * @param context optional context for conditions that need runtime information
 * @returns true if conditions are respected
 */
export function checkConditionsMet(
  conditions: (Condition | LegacyCondition)[],
  hass: HomeAssistant,
  context: ConditionContext
): boolean {
  return conditions.every((c) => {
    if ("condition" in c) {
      switch (c.condition) {
        case "view_columns":
          return checkViewColumnsCondition(c, context);
        case "time":
          return checkTimeCondition(c, hass);
        case "screen":
          return checkScreenCondition(c, hass);
        case "user":
          return checkUserCondition(c, hass);
        case "location":
          return checkLocationCondition(c, hass);
        case "numeric_state":
          return checkStateNumericCondition(c, hass, context);
        case "and":
          return checkAndCondition(c, hass, context);
        case "not":
          return checkNotCondition(c, hass, context);
        case "or":
          return checkOrCondition(c, hass, context);
        default:
          return checkStateCondition(c, hass, context);
      }
    }
    return checkStateCondition(c, hass, context);
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
  return condition.state != null || condition.state_not != null;
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

function validateViewColumnsCondition(condition: ViewColumnsCondition) {
  return condition.min != null || condition.max != null;
}

function validateNumericStateCondition(condition: NumericStateCondition) {
  return condition.above != null || condition.below != null;
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
        case "view_columns":
          return validateViewColumnsCondition(c);
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
    (condition.condition === "state" ||
      condition.condition === "numeric_state") &&
    // A core-format condition already targets its own `entity_id`; do not graft
    // the host's context entity onto it (that would both mis-evaluate and emit a
    // schema-invalid core condition carrying both `entity` and `entity_id`).
    !("entity_id" in condition)
  ) {
    return {
      entity: entityId,
      ...condition,
    };
  }
  return condition;
}
