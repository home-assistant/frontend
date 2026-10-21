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
import type { ConditionDescriptions } from "../../../data/condition";
import { CONDITION_BUILDING_BLOCKS } from "../../../data/condition";
import type { Action, RepeatAction } from "../../../data/script";
import type { TriggerDescriptions } from "../../../data/trigger";
import { isTriggerList } from "../../../data/trigger";
import { getRepeatType } from "./action/types/ha-automation-action-repeat";

// Turn a key picked in the add element dialog into a new item.
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

// The inverse of the create functions: the dialog key an existing item was
// created from. Ids with a dot are platforms even before descriptions load.
export const getTriggerPickerKey = (
  trigger: Exclude<Trigger, TriggerList>,
  descriptions: TriggerDescriptions
): string =>
  trigger.trigger in descriptions || trigger.trigger.includes(".")
    ? `${DYNAMIC_PREFIX}${trigger.trigger}`
    : trigger.trigger;

export const getConditionPickerKey = (
  condition: Condition,
  descriptions: ConditionDescriptions
): string =>
  condition.condition in descriptions || condition.condition.includes(".")
    ? `${DYNAMIC_PREFIX}${condition.condition}`
    : condition.condition;

export const getActionPickerKey = (action: Action): string | undefined => {
  const type = getAutomationActionType(action);
  if (type === "service") {
    const service = (action as { action?: string }).action;
    return service?.includes(".") ? `${DYNAMIC_PREFIX}${service}` : type;
  }
  if (type === "repeat") {
    return `repeat_${getRepeatType((action as RepeatAction).repeat)}`;
  }
  return type;
};

const isLogicalCondition = (condition: object) =>
  CONDITION_BUILDING_BLOCKS.some(
    (key) => key in condition || (condition as Condition).condition === key
  );

// Containers hold nested items that a replacement would discard.
export const isTriggerReplaceable = (trigger: Trigger) =>
  !isTriggerList(trigger);

export const isConditionReplaceable = (condition: Condition) =>
  !isLogicalCondition(condition);

export const isActionReplaceable = (action: Action) => {
  const key = getActionPickerKey(action);
  if (key === "condition") {
    return !isLogicalCondition(action);
  }
  return (
    key !== undefined &&
    ![...ACTION_BUILDING_BLOCKS, ...ACTION_COMBINED_BLOCKS].includes(key)
  );
};
