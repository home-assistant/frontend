import deepClone from "deep-clone-simple";
import type { HassServiceTarget } from "home-assistant-js-websocket";
import {
  ACTION_BUILDING_BLOCKS,
  ACTION_COMBINED_BLOCKS,
  VIRTUAL_ACTIONS,
  getAutomationActionType,
} from "../../../data/action";
import type { Condition, Trigger, TriggerList } from "../../../data/automation";
import {
  DYNAMIC_PREFIX,
  getValueFromDynamic,
  isDynamic,
} from "../../../data/automation";
import {
  isPlatformCondition,
  isPlatformTrigger,
} from "../../../data/automation_replace";
import type { ConditionDescriptions } from "../../../data/condition";
import { CONDITION_BUILDING_BLOCKS } from "../../../data/condition";
import type { Action } from "../../../data/script";
import type { TriggerDescriptions } from "../../../data/trigger";
import { isTriggerList } from "../../../data/trigger";

export const createTrigger = (
  key: string,
  target?: HassServiceTarget
): Trigger => {
  if (isDynamic(key)) {
    return { trigger: getValueFromDynamic(key), target };
  }
  const elClass = customElements.get(
    `ha-automation-trigger-${key}`
  ) as CustomElementConstructor & { defaultConfig: Trigger };
  return {
    ...elClass.defaultConfig,
    ...(target?.entity_id ? { entity_id: target.entity_id } : {}),
  };
};

export const createCondition = (
  key: string,
  target?: HassServiceTarget
): Condition => {
  if (isDynamic(key)) {
    return { condition: getValueFromDynamic(key), target };
  }
  const elClass = customElements.get(
    `ha-automation-condition-${key}`
  ) as CustomElementConstructor & { defaultConfig: Condition };
  return {
    ...elClass.defaultConfig,
    ...(target?.entity_id ? { entity_id: target.entity_id } : {}),
  };
};

export const createAction = (
  key: string,
  target?: HassServiceTarget
): Action => {
  if (key in VIRTUAL_ACTIONS) {
    return deepClone(VIRTUAL_ACTIONS[key]);
  }
  if (isDynamic(key)) {
    return { action: getValueFromDynamic(key), metadata: {}, target };
  }
  const elClass = customElements.get(`ha-automation-action-${key}`) as
    (CustomElementConstructor & { defaultConfig: Action }) | undefined;
  return elClass ? { ...elClass.defaultConfig } : { [key]: {} };
};

export const getTriggerPickerKey = (
  trigger: Exclude<Trigger, TriggerList>,
  descriptions: TriggerDescriptions
): string =>
  isPlatformTrigger(trigger, descriptions)
    ? `${DYNAMIC_PREFIX}${trigger.trigger}`
    : trigger.trigger;

export const getConditionPickerKey = (
  condition: Condition,
  descriptions: ConditionDescriptions
): string =>
  isPlatformCondition(condition, descriptions)
    ? `${DYNAMIC_PREFIX}${condition.condition}`
    : condition.condition;

// Repeat actions are containers and never replaced, so this doesn't need the
// dialog's per-variant repeat keys.
export const getActionPickerKey = (action: Action): string | undefined => {
  const type = getAutomationActionType(action);
  if (type === "service") {
    const service = (action as { action?: string }).action;
    return service?.includes(".") ? `${DYNAMIC_PREFIX}${service}` : type;
  }
  return type;
};

const isLogicalCondition = (condition: object) =>
  Array.isArray((condition as { condition?: unknown }).condition) ||
  CONDITION_BUILDING_BLOCKS.some(
    (key) => key in condition || (condition as Condition).condition === key
  );

// Containers hold nested items that a replacement would discard.
export const isTriggerReplaceable = (trigger: Trigger) =>
  !isTriggerList(trigger);

export const isConditionReplaceable = (condition: Condition) =>
  !isLogicalCondition(condition);

export const isActionReplaceable = (action: Action) => {
  const type = getAutomationActionType(action);
  if (type === "condition") {
    return !isLogicalCondition(action);
  }
  // Every repeat holds a sequence, also one without a valid repeat type.
  return (
    type !== undefined &&
    type !== "repeat" &&
    ![...ACTION_BUILDING_BLOCKS, ...ACTION_COMBINED_BLOCKS].includes(type)
  );
};
