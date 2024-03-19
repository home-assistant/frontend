import { ensureArray } from "../../../common/array/ensure-array";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { HomeAssistant } from "../../../types";
import {
  checkCondition,
  validateCondition,
} from "./conditions/handle-condition";
import { LovelaceCondition } from "./conditions/types";

// Legacy conditional card condition
export interface LegacyCondition {
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
}

/**
 * Return the result of applying conditions
 * @param conditions conditions to apply
 * @param hass Home Assistant object
 * @returns true if conditions are respected
 */
export function checkConditionsMet(
  conditions: (LovelaceCondition | LegacyCondition)[],
  hass: HomeAssistant
): boolean {
  return conditions.every((c) => {
    if ("condition" in c) {
      return checkCondition(c, hass);
    }
    return checkCondition(
      {
        condition: "state",
        ...c,
      },
      hass
    );
  });
}

export function extractConditionEntityIds(
  conditions: LovelaceCondition[]
): Set<string> {
  const entityIds: Set<string> = new Set();
  for (const condition of conditions) {
    if (condition.condition === "numeric_state") {
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

/**
 * Validate the conditions config for the UI
 * @param conditions conditions to apply
 * @returns true if conditions are validated
 */
export function validateConditionalConfig(
  conditions: (LovelaceCondition | LegacyCondition)[]
): boolean {
  return conditions.every((c) => {
    if ("condition" in c) {
      return validateCondition(c);
    }
    return validateCondition({
      condition: "state",
      ...c,
    });
  });
}

/**
 * Build a condition for filters
 * @param condition condition to apply
 * @param entityId base the condition on that entity
 * @returns a new condition with entity id
 */
export function addEntityToCondition(
  condition: LovelaceCondition,
  entityId: string
): LovelaceCondition {
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
      ...condition,
      entity: entityId,
    };
  }
  return condition;
}
