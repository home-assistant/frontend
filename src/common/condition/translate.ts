import type {
  Condition as CoreCondition,
  NumericStateCondition as CoreNumericStateCondition,
  StateCondition as CoreStateCondition,
  TemplateCondition as CoreTemplateCondition,
} from "../../data/automation";
import {
  CONDITION_ROW_CONFIG_KEYS,
  pickRowConfig,
} from "../../data/automation";
import type {
  LegacyCondition,
  NumericStateCondition as LovelaceNumericStateCondition,
  StateCondition as LovelaceStateCondition,
  VisibilityCondition,
  VisibilityLogicalCondition,
} from "../../panels/lovelace/common/validate-condition";
import { ensureArray } from "../array/ensure-array";
import { isValidEntityId } from "../entity/valid_entity_id";

/** Client-only types. Never sent to `subscribe_condition`. */
const CLIENT_CONDITION_TYPES = new Set([
  "screen",
  "user",
  "view_columns",
  "location",
  "time",
]);

const LOGICAL_CONDITION_TYPES = new Set(["and", "or", "not"]);

/** `and` / `or` / `not`. */
export const isLogicalCondition = (
  condition: VisibilityCondition
): condition is VisibilityLogicalCondition =>
  "condition" in condition && LOGICAL_CONDITION_TYPES.has(condition.condition);

/** Children of a logical condition. Core allows a single item or a list. */
export const logicalChildren = (
  condition: VisibilityLogicalCondition
): VisibilityCondition[] => ensureArray(condition.conditions) ?? [];

/** True if `value` looks like an entity id, not a numeric literal. */
export const isEntityReference = (value: unknown): value is string =>
  typeof value === "string" && isNaN(Number(value)) && isValidEntityId(value);

/**
 * Lovelace `state` / `numeric_state` that core would evaluate differently,
 * so existing dashboards keep the client result until the user edits them:
 * stringified attributes, any-entity comparison values, entity-id bounds.
 */
const hasLegacyOnlySemantics = (
  condition:
    LovelaceStateCondition | LovelaceNumericStateCondition | LegacyCondition
): boolean => {
  if ("condition" in condition && condition.condition === "numeric_state") {
    return [condition.above, condition.below].some(isEntityReference);
  }
  const state = condition as LovelaceStateCondition | LegacyCondition;
  if ("attribute" in state && state.attribute !== undefined) {
    return true;
  }
  return [
    ...(ensureArray(state.state) ?? []),
    ...(ensureArray(state.state_not) ?? []),
  ].some(isEntityReference);
};

/**
 * True if this node should go to `subscribe_condition`.
 * A mixed `and`/`or`/`not` is client-side so it can wrap server subtrees.
 * Lovelace `state`/`numeric_state` with {@link hasLegacyOnlySemantics} stay local.
 */
export const isServerCondition = (condition: VisibilityCondition): boolean => {
  if (isLogicalCondition(condition)) {
    return logicalChildren(condition).every(isServerCondition);
  }
  // `{ entity, state }` with no `condition` key is a state condition.
  if (!("condition" in condition)) {
    return !hasLegacyOnlySemantics(condition);
  }
  if (CLIENT_CONDITION_TYPES.has(condition.condition)) {
    return false;
  }
  if (
    (condition.condition === "state" ||
      condition.condition === "numeric_state") &&
    !("entity_id" in condition)
  ) {
    return !hasLegacyOnlySemantics(
      condition as LovelaceStateCondition | LovelaceNumericStateCondition
    );
  }
  return true;
};

/** `enabled: false`. Core skips these inside `and` / `or` / `not`. */
export const isDisabledCondition = (condition: VisibilityCondition): boolean =>
  "enabled" in condition && condition.enabled === false;

/** Inverse of {@link isServerCondition}. True if any leaf is client-side. */
export const isClientCondition = (condition: VisibilityCondition): boolean =>
  !isServerCondition(condition);

/** True if every leaf is client-only (no `subscribe_condition` needed). */
export const isPureClientCondition = (
  condition: VisibilityCondition
): boolean =>
  isLogicalCondition(condition)
    ? logicalChildren(condition).every(isPureClientCondition)
    : isClientCondition(condition);

/**
 * Lovelace → core automation condition. Already-core types pass through.
 * Client-only conditions should not be passed in.
 */
export const translateToCoreCondition = (
  condition: VisibilityCondition
): CoreCondition => {
  // `{ entity, state, state_not }` with no `condition` key.
  if (!("condition" in condition)) {
    return translateStateCondition({ condition: "state", ...condition });
  }

  if (isLogicalCondition(condition)) {
    return translateLogicalCondition(condition);
  }

  switch (condition.condition) {
    case "state":
      return translateStateCondition(condition as LovelaceStateCondition);
    case "numeric_state":
      return translateNumericStateCondition(
        condition as LovelaceNumericStateCondition
      );
    default:
      return condition as CoreCondition;
  }
};

// Always-false: not(and of nothing). Used for incomplete configs so we don't
// emit something core's schema would reject (that would fail a grouped subscription).
const alwaysFalseCondition = (): CoreCondition => ({
  condition: "not",
  conditions: [{ condition: "and", conditions: [] }],
});

const translateStateCondition = (
  condition: LovelaceStateCondition | CoreStateCondition | LegacyCondition
): CoreCondition => {
  if ("entity_id" in condition) {
    return condition as CoreStateCondition;
  }

  const lovelace = condition as LovelaceStateCondition;

  const rowConfig = pickRowConfig(lovelace, CONDITION_ROW_CONFIG_KEYS);

  // Missing entity or comparison value: checkConditionsMet is false; core
  // would reject the schema.
  if (
    !lovelace.entity ||
    (lovelace.state === undefined && lovelace.state_not === undefined)
  ) {
    return { ...rowConfig, ...alwaysFalseCondition() };
  }
  const base = {
    condition: "state" as const,
    entity_id: lovelace.entity,
    ...(lovelace.attribute !== undefined
      ? { attribute: lovelace.attribute }
      : {}),
  };

  // Prefer `state` when both are set, matching checkConditionsMet.
  if (lovelace.state !== undefined) {
    return {
      ...rowConfig,
      ...base,
      state: lovelace.state,
    } as CoreStateCondition;
  }

  // Core has no `state_not`; wrap a positive `state` in `not`.
  return {
    ...rowConfig,
    condition: "not",
    conditions: [{ ...base, state: lovelace.state_not } as CoreStateCondition],
  };
};

const translateNumericStateCondition = (
  condition: LovelaceNumericStateCondition | CoreNumericStateCondition
): CoreCondition => {
  if ("entity_id" in condition) {
    return condition as CoreNumericStateCondition;
  }
  const lovelace = condition as LovelaceNumericStateCondition;
  const rowConfig = pickRowConfig(lovelace, CONDITION_ROW_CONFIG_KEYS);

  // Missing entity: checkConditionsMet is false; core would reject the schema.
  if (!lovelace.entity) {
    return { ...rowConfig, ...alwaysFalseCondition() };
  }

  const above = translateNumericBound(lovelace.above, "above");
  const below = translateNumericBound(lovelace.below, "below");

  if (typeof above === "symbol" || typeof below === "symbol") {
    // `above: +∞` / `below: -∞` can never pass.
    return { ...rowConfig, ...alwaysFalseCondition() };
  }

  if (above === undefined && below === undefined) {
    // No usable bound. Lovelace only checks that the value is numeric; core
    // requires a bound, so express that as a template.
    return {
      ...rowConfig,
      ...numericValueCondition(lovelace.entity, lovelace.attribute),
    };
  }

  const core: CoreNumericStateCondition = {
    ...rowConfig,
    condition: "numeric_state",
    entity_id: lovelace.entity,
  };
  if (lovelace.attribute !== undefined) {
    core.attribute = lovelace.attribute;
  }
  if (above !== undefined) {
    core.above = above;
  }
  if (below !== undefined) {
    core.below = below;
  }
  return core;
};

// Numeric-only check when lovelace ignored every bound.
const numericValueCondition = (
  entityId: string,
  attribute?: string
): CoreTemplateCondition => ({
  condition: "template",
  value_template:
    attribute === undefined
      ? `{{ is_number(states(${JSON.stringify(entityId)})) }}`
      : `{{ is_number(state_attr(${JSON.stringify(entityId)}, ${JSON.stringify(attribute)})) }}`,
});

// Bound that can never pass (see `translateNumericBound`).
const NEVER_SATISFIED = Symbol("never-satisfied");

/**
 * Map a lovelace numeric bound onto core.
 * Numeric strings become numbers (try Number() first — `"10.5"` looks like an id).
 * Real entity ids pass through. Junk is dropped. ±Infinity: never-pass sides
 * become {@link NEVER_SATISFIED}; always-pass sides are dropped (not JSON-safe).
 */
const translateNumericBound = (
  bound: string | number | null | undefined,
  side: "above" | "below"
): string | number | undefined | typeof NEVER_SATISFIED => {
  // YAML `null` is the same as a missing bound.
  if (bound == null) {
    return undefined;
  }
  const numeric = typeof bound === "number" ? bound : Number(bound);
  if (isNaN(numeric)) {
    return typeof bound === "string" && isValidEntityId(bound)
      ? bound
      : undefined;
  }
  if (!isFinite(numeric)) {
    return (side === "above") === numeric > 0 ? NEVER_SATISFIED : undefined;
  }
  return numeric;
};

const translateLogicalCondition = (
  condition: VisibilityLogicalCondition
): CoreCondition => {
  const rowConfig = pickRowConfig(condition, CONDITION_ROW_CONFIG_KEYS);

  // Missing `conditions` is treated as true.
  if (condition.conditions === undefined) {
    return { ...rowConfig, condition: "and", conditions: [] };
  }

  const conditions = logicalChildren(condition).map(translateToCoreCondition);

  if (condition.condition === "not") {
    // Lovelace `not` is NOT(AND); core `not` is NOT(OR). Keep the `and`
    // wrapper even for one child: a skipped disabled child must stay false.
    return {
      ...rowConfig,
      condition: "not",
      conditions: [{ condition: "and", conditions }],
    };
  }

  return { ...rowConfig, condition: condition.condition, conditions };
};
