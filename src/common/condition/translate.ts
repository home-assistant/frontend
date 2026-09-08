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
 * Children of a logical condition as a list. Core accepts a single condition
 * as well as a list for `conditions`; a missing key yields an empty list.
 */
export const logicalChildren = (
  condition: VisibilityLogicalCondition
): VisibilityCondition[] => ensureArray(condition.conditions) ?? [];

/** Whether a string is an entity-id reference rather than a numeric literal. */
export const isEntityReference = (value: unknown): value is string =>
  typeof value === "string" && isNaN(Number(value)) && isValidEntityId(value);

/**
 * Whether a lovelace-format `state` / `numeric_state` leaf relies on semantics
 * core's counterpart does not reproduce, so it must stay client-evaluated for
 * an existing dashboard to keep behaving the same (read-both back-compat):
 *
 * - `state` with `attribute`: lovelace compares the *stringified* attribute
 *   value, core the raw one (`5` vs `"5"` differ);
 * - `state` / `state_not` values that are entity ids: lovelace resolves *any*
 *   existing entity to its live state, core only dereferences `input_*`;
 * - numeric bounds that are entity ids: lovelace ignores a missing entity,
 *   core reports an error.
 *
 * Once the user edits such a condition it is saved in core format and
 * evaluated by core (write-new).
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
 * Whether a condition must be evaluated server-side (via `subscribe_condition`).
 *
 * Leaves: everything except the client-only lovelace types is server-class,
 * including legacy `{ entity, state }` conditions (treated as `state`) and any
 * integration-provided condition — with one carve-out: a lovelace-format
 * `state` / `numeric_state` whose semantics core cannot reproduce stays
 * client-side (see {@link hasLegacyOnlySemantics}).
 *
 * Compounds (`and` / `or` / `not`) are server-class only when *every*
 * descendant is, so a single client leaf anywhere forces the whole compound
 * client-side, where it becomes a combinator wrapping server subtrees (see
 * `splitConditionTree`). An empty compound is vacuously server-class.
 */
export const isServerCondition = (condition: VisibilityCondition): boolean => {
  if (isLogicalCondition(condition)) {
    return logicalChildren(condition).every(isServerCondition);
  }
  // Legacy lovelace condition without a `condition` key → treated as `state`.
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

/**
 * Whether a node is disabled (`enabled: false`). Core skips such a node inside
 * `and` / `or` / `not` (it neither passes nor fails), so client-side evaluation
 * drops it from its parent's children before combining. A template-valued
 * `enabled` cannot be evaluated here and is left to core (server nodes) or
 * treated as enabled (client nodes).
 */
export const isDisabledCondition = (condition: VisibilityCondition): boolean =>
  "enabled" in condition && condition.enabled === false;

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
    ? logicalChildren(condition).every(isPureClientCondition)
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

  // Core row metadata (`enabled`, `alias`, `note`) rides along on whatever is
  // emitted; for `state_not` it belongs on the outer `not`.
  const rowConfig = pickRowConfig(lovelace, CONDITION_ROW_CONFIG_KEYS);

  // Incomplete config: no (or an empty) entity, or no comparison value.
  // checkConditionsMet returns false for these (and a `state` condition with
  // no `entity_id` / `state` is invalid for core), so resolve to a clean
  // always-false.
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

  // Attribute comparisons and entity-id comparison values are compared
  // differently by core (raw attribute values; only `input_*` dereferenced),
  // so leaves relying on them are never routed here for evaluation — they stay
  // client-side (see `hasLegacyOnlySemantics`). The translation itself passes
  // them through unchanged; it is also what the editor persists once the user
  // saves such a condition, at which point core semantics apply.

  // `state` wins over `state_not` when both are present, mirroring
  // checkConditionsMet (`state ?? state_not`, positive branch when `state`).
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

  // Incomplete config: no (or an empty) entity. checkConditionsMet returns
  // false (no state object → NaN), and core rejects a bound-less / entity-less
  // condition, so resolve to a clean always-false rather than a schema-invalid
  // leaf.
  if (!lovelace.entity) {
    return { ...rowConfig, ...alwaysFalseCondition() };
  }

  const above = translateNumericBound(lovelace.above, "above");
  const below = translateNumericBound(lovelace.below, "below");

  if (typeof above === "symbol" || typeof below === "symbol") {
    // An infinite bound lovelace can never satisfy (`above: +∞`, `below: -∞`).
    return { ...rowConfig, ...alwaysFalseCondition() };
  }

  if (above === undefined && below === undefined) {
    // Every configured bound was junk (non-numeric, non-entity) or none was
    // configured. Lovelace ignores such bounds and only requires the value to
    // be numeric; core requires at least one bound, so express that check as
    // a template instead of emitting a condition its schema would reject
    // (which would fail the whole grouped subscription).
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

// "The entity's state (or attribute) is numeric" — lovelace's residual check
// for a numeric_state condition whose bounds are all ignored.
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

// Sentinel for a bound that makes the lovelace comparison fail whatever the
// state is (see `translateNumericBound`).
const NEVER_SATISFIED = Symbol("never-satisfied");

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
 * - junk like `"foo"` is dropped, matching lovelace's "NaN ⇒ ignored"; when
 *   that leaves no bound at all, the caller falls back to a numeric-value
 *   check (see `numericValueCondition`);
 * - an infinite value (`"1e400"`, YAML `.inf`) is *not* ignored by lovelace:
 *   `above: +∞` / `below: -∞` can never be satisfied ({@link NEVER_SATISFIED}),
 *   while `above: -∞` / `below: +∞` always are and are dropped, since Infinity
 *   is not JSON-serializable anyway.
 */
const translateNumericBound = (
  bound: string | number | null | undefined,
  side: "above" | "below"
): string | number | undefined | typeof NEVER_SATISFIED => {
  // YAML `above: null` (or an empty value) is absent for lovelace as well.
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
  // Core row metadata (`enabled`, `alias`, `note`) must survive the rebuild so
  // core still skips a disabled group.
  const rowConfig = pickRowConfig(condition, CONDITION_ROW_CONFIG_KEYS);

  // Lovelace treats a logical condition with no `conditions` key as vacuously
  // true (checkAnd/Or/NotCondition all early-return on a missing list).
  if (condition.conditions === undefined) {
    return { ...rowConfig, condition: "and", conditions: [] };
  }

  const conditions = logicalChildren(condition).map(translateToCoreCondition);

  if (condition.condition === "not") {
    // Lovelace `not` means ¬(AND of children); core `not` means ¬(OR of
    // children). Wrapping the children in an `and` preserves the lovelace
    // meaning for any arity — including an empty `not`, which becomes ¬(AND of
    // nothing) = ¬true = false, matching checkConditionsMet. The wrapper is
    // kept for a single child too: a disabled child is skipped by core, and
    // only the `and` turns that into ¬true = false rather than ¬(OR of nothing)
    // = true.
    return {
      ...rowConfig,
      condition: "not",
      conditions: [{ condition: "and", conditions }],
    };
  }

  // Empty `and` (true) / `or` (false) already agree between lovelace and core.
  return { ...rowConfig, condition: condition.condition, conditions };
};
