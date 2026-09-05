import type {
  Condition as CoreCondition,
  NumericStateCondition as CoreNumericStateCondition,
  StateCondition as CoreStateCondition,
} from "../../data/automation";
import type {
  LegacyCondition,
  NumericStateCondition as LovelaceNumericStateCondition,
  StateCondition as LovelaceStateCondition,
  VisibilityCondition,
  VisibilityLogicalCondition,
} from "../../panels/lovelace/common/validate-condition";
import { isValidEntityId } from "../entity/valid_entity_id";

/**
 * Lovelace condition types evaluated on the client; these have no usable core
 * equivalent for dashboards and are never sent to `subscribe_condition`.
 */
const CLIENT_CONDITION_TYPES = new Set([
  "screen",
  "user",
  "view_columns",
  "location",
  "time",
]);

const LOGICAL_CONDITION_TYPES = new Set(["and", "or", "not"]);

/** Type guard for the `and` / `or` / `not` combinators. */
export const isLogicalCondition = (
  condition: VisibilityCondition
): condition is VisibilityLogicalCondition =>
  "condition" in condition && LOGICAL_CONDITION_TYPES.has(condition.condition);

/**
 * Whether a condition must be evaluated server-side (via `subscribe_condition`).
 *
 * Leaves: everything except the client-only lovelace types is server-class,
 * including legacy `{ entity, state }` conditions (treated as `state`) and any
 * integration-provided condition.
 *
 * Compounds (`and` / `or` / `not`) are server-class only when *every*
 * descendant is, so a single client leaf anywhere forces the whole compound
 * client-side, where it becomes a combinator wrapping server subtrees (see
 * `splitConditionTree`). An empty compound is vacuously server-class.
 */
export const isServerCondition = (condition: VisibilityCondition): boolean => {
  if (isLogicalCondition(condition)) {
    return (condition.conditions ?? []).every(isServerCondition);
  }
  // Legacy lovelace condition without a `condition` key → treated as `state`.
  if (!("condition" in condition)) {
    return true;
  }
  return !CLIENT_CONDITION_TYPES.has(condition.condition);
};

/** Inverse of {@link isServerCondition}. */
export const isClientCondition = (condition: VisibilityCondition): boolean =>
  !isServerCondition(condition);

/**
 * Whether *every* leaf in the tree is a client-only condition, so the whole
 * tree can be evaluated and validated client-side without any
 * `subscribe_condition` round-trip. Distinct from {@link isClientCondition},
 * which is true when *any* leaf is client-side.
 */
export const isPureClientCondition = (
  condition: VisibilityCondition
): boolean =>
  isLogicalCondition(condition)
    ? (condition.conditions ?? []).every(isPureClientCondition)
    : isClientCondition(condition);

/**
 * Translate a server-class lovelace condition into its core automation
 * equivalent. Core-format conditions (and condition types with no lovelace
 * counterpart, like `template` / `sun` / `zone` / `device` / integration
 * conditions) are passed through untouched.
 *
 * The caller is responsible for only translating server-class conditions
 * ({@link isServerCondition}); passing a client-only condition just returns it
 * unchanged.
 */
export const translateToCoreCondition = (
  condition: VisibilityCondition
): CoreCondition => {
  // Legacy lovelace condition: { entity, state, state_not } with no `condition`.
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
      // Already core format (sun, zone, template, device, integration, or a
      // core `state` / `numeric_state` carrying `entity_id`) → pass through.
      return condition as CoreCondition;
  }
};

// A core condition that always evaluates to false — ¬(AND of nothing) = ¬true.
// Used where checkConditionsMet short-circuits to false (an incomplete config),
// so we never emit a schema-invalid condition that would break a grouped
// subscription.
const alwaysFalseCondition = (): CoreCondition => ({
  condition: "not",
  conditions: [{ condition: "and", conditions: [] }],
});

const translateStateCondition = (
  condition: LovelaceStateCondition | CoreStateCondition | LegacyCondition
): CoreCondition => {
  // Already core format — distinguished from lovelace by `entity_id`.
  if ("entity_id" in condition) {
    return condition as CoreStateCondition;
  }

  const lovelace = condition as LovelaceStateCondition;

  // Incomplete config: no entity, or no comparison value. checkConditionsMet
  // returns false for these (and a `state` condition with no `entity_id` /
  // `state` is invalid for core), so resolve to a clean always-false.
  if (
    lovelace.entity === undefined ||
    (lovelace.state === undefined && lovelace.state_not === undefined)
  ) {
    return alwaysFalseCondition();
  }

  const base = {
    condition: "state" as const,
    entity_id: lovelace.entity,
    ...(lovelace.attribute !== undefined
      ? { attribute: lovelace.attribute }
      : {}),
  };

  // KNOWN LIMITATION: when the compared value is itself an entity id, lovelace
  // (checkStateCondition -> getValueFromEntityId) resolves *any* entity to its
  // live state, but core's `state` condition only dereferences `input_*`
  // entities and compares everything else literally. A value referencing a
  // non-`input_*` entity therefore changes meaning after delegation. This is
  // niche (the visibility editor does not offer entity-as-value) and left as a
  // future enhancement — a faithful, reactive fix would emit a `template`
  // condition. See https://github.com/home-assistant/frontend/issues/52836.

  // `state` wins over `state_not` when both are present, mirroring
  // checkConditionsMet (`state ?? state_not`, positive branch when `state`).
  if (lovelace.state !== undefined) {
    return { ...base, state: lovelace.state } as CoreStateCondition;
  }

  // Core has no `state_not`; wrap a positive `state` in `not`.
  return {
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
  const core: CoreNumericStateCondition = {
    condition: "numeric_state",
    entity_id: lovelace.entity as string,
  };
  if (lovelace.attribute !== undefined) {
    core.attribute = lovelace.attribute;
  }
  const above = translateNumericBound(lovelace.above);
  if (above !== undefined) {
    core.above = above;
  }
  const below = translateNumericBound(lovelace.below);
  if (below !== undefined) {
    core.below = below;
  }
  return core;
};

/**
 * Reconcile a lovelace numeric bound with core's interpretation. Lovelace
 * resolves a string bound to an entity's state only when that entity exists,
 * otherwise falling back to `Number(...)` (which yields `NaN` for junk, leaving
 * the bound effectively ignored). Core instead treats *every* string bound as
 * an entity id and errors when it is not one. To preserve lovelace behavior:
 *
 * - a finite numeric string (`"5"`, `"10.5"`, even `""` → 0) coerces to a
 *   number (the entity-id regex matches `"10.5"`, so test `Number()` first);
 * - a genuine entity-id reference passes through for core to resolve;
 * - anything else (junk like `"foo"`, or non-finite like `"1e400"`) is dropped,
 *   matching lovelace's "NaN ⇒ ignored" and never emitting a non-finite number
 *   (which is not JSON-serializable).
 */
const translateNumericBound = (
  bound: string | number | undefined
): string | number | undefined => {
  if (typeof bound !== "string") {
    return bound;
  }
  const numeric = Number(bound);
  if (!isNaN(numeric) && isFinite(numeric)) {
    return numeric;
  }
  if (isValidEntityId(bound)) {
    return bound;
  }
  return undefined;
};

const translateLogicalCondition = (
  condition: VisibilityLogicalCondition
): CoreCondition => {
  // Lovelace treats a logical condition with no `conditions` key as vacuously
  // true (checkAnd/Or/NotCondition all early-return on a missing list).
  if (condition.conditions === undefined) {
    return { condition: "and", conditions: [] };
  }

  const conditions = condition.conditions.map(translateToCoreCondition);

  if (condition.condition === "not") {
    // Lovelace `not` means ¬(AND of children); core `not` means ¬(OR of
    // children). Wrapping the children in an `and` preserves the lovelace
    // meaning for any arity — including an empty `not`, which becomes ¬(AND of
    // nothing) = ¬true = false, matching checkConditionsMet. A single child is
    // unambiguous (¬(OR of one) = ¬(AND of one)) and left unwrapped for a
    // tidier persisted form.
    if (conditions.length === 1) {
      return { condition: "not", conditions };
    }
    return { condition: "not", conditions: [{ condition: "and", conditions }] };
  }

  // Empty `and` (true) / `or` (false) already agree between lovelace and core.
  return { condition: condition.condition, conditions };
};
