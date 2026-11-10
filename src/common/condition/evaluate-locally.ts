import type {
  Condition,
  ConditionContext,
  VisibilityCondition,
} from "../../panels/lovelace/common/validate-condition";
import { checkConditionsMet } from "../../panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../../types";
import { ensureArray } from "../array/ensure-array";
import {
  isClientCondition,
  isDisabledCondition,
  isEntityReference,
  isLogicalCondition,
  logicalChildren,
} from "./translate";

// Combinators: true / false / undefined (unknown)
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
 * True when `checkConditionsMet` matches core for this leaf, so we can
 * show a result before `subscribe_condition` replies.
 */
const isLocallyEvaluableServerLeaf = (
  condition: VisibilityCondition,
  states: HomeAssistant["states"],
  context: ConditionContext
): boolean => {
  const type = "condition" in condition ? condition.condition : "state";
  if (type !== "state" && type !== "numeric_state") {
    return false;
  }

  if (!("entity_id" in condition)) {
    // Empty `entity: ""` falls back to the host entity, like checkStateCondition.
    const target =
      ("entity" in condition ? condition.entity : undefined) ||
      context.entity_id;
    return !!target && target in states;
  }

  const core = condition as {
    entity_id?: unknown;
    attribute?: unknown;
    for?: unknown;
    match?: unknown;
    value_template?: unknown;
    state?: unknown;
    above?: unknown;
    below?: unknown;
  };
  if (
    typeof core.entity_id !== "string" ||
    !(core.entity_id in states) ||
    core.attribute !== undefined ||
    core.for !== undefined ||
    core.match !== undefined ||
    core.value_template !== undefined
  ) {
    return false;
  }
  if (type === "numeric_state") {
    const bounds = [core.above, core.below].filter((b) => b !== undefined);
    return bounds.length > 0 && bounds.every((b) => typeof b === "number");
  }
  return !ensureArray(core.state as string | string[] | undefined)?.some(
    isEntityReference
  );
};

/**
 * Evaluate the parts of a visibility tree the client can know exactly.
 * Unknown leaves stay unknown (`not: [template]` is not treated as visible).
 * Returns `undefined` when the result still depends on core.
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
    // Template `enabled` is only known to core; the local evaluator ignores it.
    if ("enabled" in condition && typeof condition.enabled !== "boolean") {
      return undefined;
    }
    if (isLogicalCondition(condition)) {
      // Missing `conditions` is treated as true, matching checkAnd/Or/NotCondition.
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
      // Lovelace `not` is NOT(AND of children).
      return condition.condition === "not"
        ? all === undefined
          ? undefined
          : !all
        : all;
    }
    if (
      isClientCondition(condition) ||
      isLocallyEvaluableServerLeaf(condition, hass.states, context)
    ) {
      return evaluateLeaf(condition);
    }
    return undefined;
  };

  // Top-level list is AND. Skip `enabled: false` nodes, as core does.
  return andOf(
    conditions.filter((c) => !isDisabledCondition(c)).map(evaluateNode)
  );
};
