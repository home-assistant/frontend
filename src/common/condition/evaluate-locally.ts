import type {
  Condition,
  ConditionContext,
  VisibilityCondition,
} from "../../panels/lovelace/common/validate-condition";
import { checkConditionsMet } from "../../panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../../types";
import {
  isClientCondition,
  isDisabledCondition,
  isLogicalCondition,
  logicalChildren,
} from "./translate";

// Three-valued combinators (true / false / undefined = unknown).
const andOf = (values: (boolean | undefined)[]): boolean | undefined => {
  let unknown = false;
  for (const value of values) {
    if (value === false) return false;
    if (value === undefined) unknown = true;
  }
  return unknown ? undefined : true;
};

const orOf = (values: (boolean | undefined)[]): boolean | undefined => {
  let unknown = false;
  for (const value of values) {
    if (value === true) return true;
    if (value === undefined) unknown = true;
  }
  return unknown ? undefined : false;
};

/**
 * Whether a server-class leaf has semantics the legacy client evaluator
 * reproduces exactly: a lovelace-format (`entity`-based or legacy) `state` /
 * `numeric_state` whose target entity is present (a missing entity is an
 * error for core, which hides the tree, while the legacy evaluator compares
 * against the literal `unknown`), or a core-format one restricted to the subset
 * `checkConditionsMet` evaluates identically — a single `entity_id` whose
 * entity is present (core errors on a missing entity, the client evaluates
 * it as `unknown`), no `for` / `match` / `value_template`, no `attribute`
 * (core compares the raw attribute value while the client stringifies it),
 * and, for `numeric_state`, at least one bound, both numeric rather than
 * entity-valued (core rejects a bound-less condition and errors on a missing
 * bound entity, while the client passes / ignores them).
 */
const isLocallyEvaluableServerLeaf = (
  condition: VisibilityCondition,
  hass: HomeAssistant,
  context: ConditionContext
): boolean => {
  if (
    "condition" in condition &&
    condition.condition !== "state" &&
    condition.condition !== "numeric_state"
  ) {
    return false;
  }
  if (!("entity_id" in condition)) {
    // Lovelace format (or legacy `{ entity, state }`): exact as long as the
    // target entity exists.
    const target =
      ("entity" in condition ? condition.entity : undefined) ??
      context.entity_id;
    return target !== undefined && hass.states[target] !== undefined;
  }
  const core = condition as {
    entity_id?: unknown;
    attribute?: unknown;
    for?: unknown;
    match?: unknown;
    value_template?: unknown;
    above?: unknown;
    below?: unknown;
  };
  if (
    typeof core.entity_id !== "string" ||
    hass.states[core.entity_id] === undefined ||
    core.attribute !== undefined ||
    core.for !== undefined ||
    core.match !== undefined ||
    core.value_template !== undefined
  ) {
    return false;
  }
  if (condition.condition === "numeric_state") {
    return (
      (typeof core.above === "number" || typeof core.below === "number") &&
      (core.above === undefined || typeof core.above === "number") &&
      (core.below === undefined || typeof core.below === "number")
    );
  }
  return true;
};

/**
 * Evaluate a visibility condition tree on the client as far as it can be
 * evaluated *exactly*, using three-valued logic.
 *
 * Client-only leaves and server leaves whose semantics the legacy evaluator
 * reproduces (see {@link isLocallyEvaluableServerLeaf}) are evaluated with
 * `checkConditionsMet`; every other leaf (`template`, `sun`, `zone`, `device`,
 * integration conditions, core `state` with `for`, a template-valued
 * `enabled`, …) is unknown, and `enabled: false` nodes are skipped. Unknown
 * propagates through `and` / `or` / `not` unless a sibling decides the result,
 * so e.g. `not: [template]` stays unknown rather than being inverted to true.
 *
 * Returns `undefined` when the outcome depends on a leaf that only core can
 * evaluate. Intended as the optimistic seed while a `subscribe_condition`
 * result is pending.
 */
export const evaluateConditionsLocally = (
  conditions: VisibilityCondition[],
  hass: HomeAssistant,
  context: ConditionContext
): boolean | undefined => {
  const evaluateLeaf = (condition: VisibilityCondition): boolean => {
    try {
      return checkConditionsMet([condition as Condition], hass, context);
    } catch (_err) {
      return false;
    }
  };

  const evaluateNode = (
    condition: VisibilityCondition
  ): boolean | undefined => {
    // A template-valued `enabled` can only be rendered by core; the legacy
    // evaluator ignores `enabled` altogether, so leave such a node unknown.
    // (`enabled: false` nodes are skipped by the parent, see below.)
    if ("enabled" in condition && typeof condition.enabled !== "boolean") {
      return undefined;
    }
    if (isLogicalCondition(condition)) {
      // Lovelace treats a logical condition with no `conditions` key as
      // vacuously true (matches checkAnd/Or/NotCondition).
      if (condition.conditions === undefined) {
        return true;
      }
      const values = logicalChildren(condition)
        .filter((child) => !isDisabledCondition(child))
        .map(evaluateNode);
      if (condition.condition === "or") {
        return orOf(values);
      }
      const all = andOf(values);
      // Lovelace `not` is ¬(AND of children).
      return condition.condition === "not"
        ? all === undefined
          ? undefined
          : !all
        : all;
    }
    if (
      isClientCondition(condition) ||
      isLocallyEvaluableServerLeaf(condition, hass, context)
    ) {
      return evaluateLeaf(condition);
    }
    return undefined;
  };

  // The top-level array is an implicit AND. Disabled nodes are skipped, as
  // core does inside a compound.
  return andOf(
    conditions.filter((c) => !isDisabledCondition(c)).map(evaluateNode)
  );
};
