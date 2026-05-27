import type { HassServiceTarget } from "home-assistant-js-websocket";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeObjectId } from "../../../../common/entity/compute_object_id";
import {
  ACTION_BUILDING_BLOCKS,
  ACTION_COMBINED_BLOCKS,
} from "../../../../data/action";
import type { Action, ServiceAction } from "../../../../data/script";
import type { HomeAssistant } from "../../../../types";
import { getAutomationActionType } from "./ha-automation-action-row";

type FieldSelector = Record<string, unknown> | undefined;

const getSelectorType = (selector: FieldSelector): string | undefined => {
  if (!selector) {
    return undefined;
  }
  const keys = Object.keys(selector);
  return keys.length === 1 ? keys[0] : undefined;
};

const getSelectOptionValues = (
  selector: FieldSelector
): string[] | undefined => {
  const config = selector?.select as
    | { options?: readonly (string | { value: string })[] }
    | null
    | undefined;
  if (!config?.options) {
    return undefined;
  }
  return config.options.map((opt) =>
    typeof opt === "string" ? opt : opt.value
  );
};

/**
 * A value is compatible with the new field if either:
 *  - the new field has no selector (unknown shape — accept),
 *  - the old field had no selector but the new one does (best effort — accept),
 *  - the selector types match. For `select` selectors, additionally require
 *    that every supplied value is present in the new option list.
 */
const isFieldValueCompatible = (
  value: unknown,
  oldSelector: FieldSelector,
  newSelector: FieldSelector
): boolean => {
  const newType = getSelectorType(newSelector);
  if (newType === undefined) {
    return true;
  }
  const oldType = getSelectorType(oldSelector);
  if (oldType !== undefined && oldType !== newType) {
    return false;
  }
  if (newType === "select") {
    const allowed = getSelectOptionValues(newSelector);
    if (!allowed) {
      return true;
    }
    const allowedSet = new Set(allowed);
    const values = Array.isArray(value) ? value : [value];
    return values.every((v) => typeof v === "string" && allowedSet.has(v));
  }
  return true;
};

const filterTargetEntitiesByDomain = (
  target: HassServiceTarget,
  domain: string | undefined
): HassServiceTarget => {
  if (!domain || target.entity_id === undefined) {
    return target;
  }
  const entityIds = Array.isArray(target.entity_id)
    ? target.entity_id
    : [target.entity_id];
  const filtered = entityIds.filter((id) => computeDomain(id) === domain);
  const { entity_id: _entityId, ...rest } = target;
  if (filtered.length === 0) {
    return rest;
  }
  return { ...rest, entity_id: filtered };
};

export const BASE_ACTION_FIELDS = [
  "alias",
  "note",
  "enabled",
  "continue_on_error",
] as const;

const BUILDING_BLOCK_TYPES = new Set<string>([
  ...ACTION_BUILDING_BLOCKS,
  ...ACTION_COMBINED_BLOCKS,
]);

export const isBuildingBlockAction = (action: Action): boolean => {
  const type = getAutomationActionType(action);
  return type !== undefined && BUILDING_BLOCK_TYPES.has(type);
};

/**
 * Encode an action as a stable picker key.
 * - Service actions → `domain.service` (always contains a dot).
 * - Everything else → the action type identifier (no dot).
 */
export const getActionKey = (action: Action): string | undefined => {
  const type = getAutomationActionType(action);
  if (type === "service") {
    return (action as ServiceAction).action || undefined;
  }
  return type;
};

const isServiceKey = (key: string) => key.includes(".");

/** Build a fresh action with default content for the given picker key. */
export const buildActionFromKey = (key: string): Action => {
  if (isServiceKey(key)) {
    return {
      action: key,
      metadata: {},
    } as ServiceAction;
  }
  const elClass = customElements.get(`ha-automation-action-${key}`) as
    | (CustomElementConstructor & { defaultConfig?: Action })
    | undefined;
  if (elClass?.defaultConfig) {
    return { ...elClass.defaultConfig };
  }
  return { [key]: {} } as Action;
};

const isServiceAction = (action: Action): action is ServiceAction =>
  "action" in action && !!(action as ServiceAction).action;

/**
 * Merge fields from `oldAction` into `newAction` that are still compatible.
 * Behavior: copy base fields if old has them, and for service → service copy
 * `target` and any `data` keys that the new service still supports.
 */
export const convertAction = (
  oldAction: Action,
  newAction: Action,
  services: HomeAssistant["services"]
): Action => {
  const merged: Action = { ...newAction };

  for (const field of BASE_ACTION_FIELDS) {
    const oldValue = (oldAction as Record<string, unknown>)[field];
    if (oldValue !== undefined) {
      (merged as Record<string, unknown>)[field] = oldValue;
    }
  }

  if (isServiceAction(oldAction) && isServiceAction(merged)) {
    if (oldAction.target) {
      const newDomain = merged.action
        ? computeDomain(merged.action)
        : undefined;
      merged.target = filterTargetEntitiesByDomain(oldAction.target, newDomain);
    }

    if (oldAction.data && merged.action && oldAction.action) {
      const newDomain = computeDomain(merged.action);
      const newService = computeObjectId(merged.action);
      const newFields = services[newDomain]?.[newService]?.fields;
      const oldDomain = computeDomain(oldAction.action);
      const oldService = computeObjectId(oldAction.action);
      const oldFields = services[oldDomain]?.[oldService]?.fields;
      if (newFields) {
        const carried: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(oldAction.data)) {
          const newField = newFields[key];
          if (
            newField &&
            isFieldValueCompatible(
              value,
              oldFields?.[key]?.selector,
              newField.selector
            )
          ) {
            carried[key] = value;
          }
        }
        if (Object.keys(carried).length > 0) {
          merged.data = carried;
        }
      }
    }
  }

  return merged;
};
