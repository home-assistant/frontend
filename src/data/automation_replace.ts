import deepClone from "deep-clone-simple";
import type {
  HassService,
  HassServiceTarget,
} from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import { hasTemplate } from "../common/string/has-template";
import { deepEqual } from "../common/util/deep-equal";
import type { HomeAssistant } from "../types";
import { getAutomationActionType } from "./action";
import type {
  Condition,
  PlatformCondition,
  PlatformTrigger,
  Trigger,
} from "./automation";
import {
  ACTION_ROW_CONFIG_KEYS,
  CONDITION_ROW_CONFIG_KEYS,
  TRIGGER_ROW_CONFIG_KEYS,
  pickRowConfig,
} from "./automation";
import type { ConditionDescriptions } from "./condition";
import type { Action, ServiceAction } from "./script";
import {
  fillFieldDefaults,
  filterTargetForSelector,
  type Selector,
  type TargetRegistries,
  type TargetSelector,
} from "./selector";
import type { HassServiceTargetWithExclude } from "./target";
import type { TriggerDescriptions } from "./trigger";
import { isTriggerList } from "./trigger";

interface Field {
  selector?: Selector;
  required?: boolean;
  default?: unknown;
}

type Fields = Record<string, Field>;

type TargetFilter = NonNullable<TargetSelector["target"]> | undefined;

// The alias describes what the old item did, so it would mislabel the new one.
const keptKeys = (keys: readonly string[]) =>
  keys.filter((key) => key !== "alias");

// Only an identical field is known to accept the value, templates included.
// Other values are dropped, even if that leaves the item incomplete: an
// incomplete item is visible, an invalid value might not be.
const portFields = (
  values: Record<string, unknown> | undefined,
  fields: Fields,
  oldFields: Fields | undefined
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  Object.entries(fields).forEach(([key, field]) => {
    const value = values?.[key];
    const oldSelector = oldFields?.[key]?.selector;
    if (
      value !== undefined &&
      field.selector &&
      oldSelector &&
      deepEqual(oldSelector, field.selector)
    ) {
      result[key] = deepClone(value);
    }
  });
  return result;
};

const TARGET_KEYS = [
  "entity_id",
  "device_id",
  "area_id",
  "floor_id",
  "label_id",
] as const;

const portTarget = (
  target: HassServiceTargetWithExclude | string | undefined,
  filter: TargetFilter,
  oldFilter: TargetFilter,
  registries: TargetRegistries
): HassServiceTargetWithExclude | undefined => {
  if (!target || filter === undefined) {
    return undefined;
  }
  if (oldFilter !== undefined && deepEqual(oldFilter, filter)) {
    return deepClone(target as HassServiceTargetWithExclude);
  }
  if (typeof target === "string" || hasTemplate(target)) {
    return undefined;
  }
  const result = filterTargetForSelector(
    target,
    { target: filter },
    registries
  );
  return Object.keys(result).length ? result : undefined;
};

const setTarget = <T extends { target?: HassServiceTarget }>(
  item: T,
  target: HassServiceTarget | undefined
): T => {
  const result = { ...item, target };
  if (target === undefined) {
    delete result.target;
  }
  return result;
};

const getTargetFilter = (
  description: { target?: TargetSelector["target"] | {} } | undefined
): TargetFilter =>
  description && "target" in description && description.target !== undefined
    ? (description.target ?? {})
    : undefined;

const isAutomationBehavior = (field: Field) =>
  !!field.selector && "automation_behavior" in field.selector;

// Ids with a dot are platforms even before descriptions load.
export const isPlatformTrigger = (
  trigger: Trigger,
  descriptions: TriggerDescriptions
): trigger is PlatformTrigger =>
  !isTriggerList(trigger) &&
  (trigger.trigger in descriptions || trigger.trigger.includes("."));

export const isPlatformCondition = (
  condition: Condition,
  descriptions: ConditionDescriptions
): condition is PlatformCondition =>
  condition.condition in descriptions || condition.condition.includes(".");

// Platform triggers once kept their options at the top level, and the editor
// only moves them into `options` when it opens them, so read both.
const PLATFORM_TRIGGER_KEYS: readonly string[] = [
  ...TRIGGER_ROW_CONFIG_KEYS,
  "trigger",
  "target",
  "options",
];

const getPlatformTriggerOptions = (trigger: PlatformTrigger) => {
  const options: Record<string, unknown> = {};
  Object.entries(trigger).forEach(([key, value]) => {
    if (!PLATFORM_TRIGGER_KEYS.includes(key)) {
      options[key] = value;
    }
  });
  return { ...options, ...trigger.options };
};

const portPlatformItem = <T extends PlatformTrigger | PlatformCondition>(
  item: T,
  description: { target?: TargetSelector["target"]; fields: Fields },
  old:
    | {
        target?: HassServiceTarget;
        options?: Record<string, unknown>;
        description?: { target?: TargetSelector["target"]; fields: Fields };
      }
    | undefined,
  registries: TargetRegistries
): T => {
  const target =
    item.target ??
    portTarget(
      old?.target,
      getTargetFilter(description),
      getTargetFilter(old?.description),
      registries
    );
  const fields = description.fields ?? {};
  // Fill the defaults the editors would fill for a new item, so they don't
  // change the replaced item again, which would add a second undo step.
  const options = fillFieldDefaults(
    portFields(old?.options, fields, old?.description?.fields),
    Object.entries(fields),
    true,
    (field) => isAutomationBehavior(field) && !!description.target && !target
  ).values;
  return setTarget({ ...item, options }, target);
};

export const portTrigger = (
  oldTrigger: Trigger,
  newTrigger: Trigger,
  registries: TargetRegistries,
  descriptions: TriggerDescriptions
): Trigger => {
  const trigger = {
    ...newTrigger,
    ...deepClone(pickRowConfig(oldTrigger, keptKeys(TRIGGER_ROW_CONFIG_KEYS))),
  } as Trigger;
  if (
    isTriggerList(trigger) ||
    !isPlatformTrigger(trigger, descriptions) ||
    !descriptions[trigger.trigger]
  ) {
    return trigger;
  }
  return portPlatformItem(
    trigger,
    descriptions[trigger.trigger],
    isPlatformTrigger(oldTrigger, descriptions)
      ? {
          target: oldTrigger.target,
          options: getPlatformTriggerOptions(oldTrigger),
          description: descriptions[oldTrigger.trigger],
        }
      : undefined,
    registries
  );
};

export const portCondition = (
  oldCondition: Condition,
  newCondition: Condition,
  registries: TargetRegistries,
  descriptions: ConditionDescriptions
): Condition => {
  const condition = {
    ...newCondition,
    ...deepClone(
      pickRowConfig(oldCondition, keptKeys(CONDITION_ROW_CONFIG_KEYS))
    ),
  } as Condition;
  if (
    !isPlatformCondition(condition, descriptions) ||
    !descriptions[condition.condition]
  ) {
    return condition;
  }
  return portPlatformItem(
    condition,
    descriptions[condition.condition],
    isPlatformCondition(oldCondition, descriptions)
      ? {
          target: oldCondition.target,
          options: oldCondition.options,
          description: descriptions[oldCondition.condition],
        }
      : undefined,
    registries
  );
};

interface ServiceFieldWithSection extends Field {
  fields?: Fields;
}

const getService = (
  services: HomeAssistant["services"],
  action: string | undefined
): HassService | undefined => {
  if (!action?.includes(".")) {
    return undefined;
  }
  return services[computeDomain(action)]?.[computeObjectId(action)];
};

// Sections only group fields in the UI, their values are not nested.
const getServiceFields = (service: HassService | undefined) => {
  const fields: Fields = {};
  Object.entries(
    (service?.fields ?? {}) as Record<string, ServiceFieldWithSection>
  ).forEach(([key, field]) => {
    if (field.fields) {
      Object.assign(fields, field.fields);
    } else {
      fields[key] = field;
    }
  });
  return fields;
};

// The target of older service actions can also be stored in `data` or at the
// top level.
const getServiceTarget = (
  action: ServiceAction
): HassServiceTarget | string | undefined => {
  const target = action.target as HassServiceTarget | string | undefined;
  if (typeof target === "string") {
    return target;
  }
  const result: HassServiceTarget = { ...target };
  TARGET_KEYS.forEach((key) => {
    const legacy =
      action.data?.[key] ??
      (key === "entity_id" ? action.entity_id : undefined);
    if (result[key] === undefined && legacy !== undefined) {
      result[key] = legacy as string | string[];
    }
  });
  return Object.keys(result).length ? result : undefined;
};

const isServiceAction = (action: Action): action is ServiceAction =>
  getAutomationActionType(action) === "service";

export const portAction = (
  oldAction: Action,
  newAction: Action,
  registries: TargetRegistries & Pick<HomeAssistant, "services">
): Action => {
  // `continue_on_error` isn't valid on conditions.
  const keys = keptKeys(ACTION_ROW_CONFIG_KEYS).filter(
    (key) =>
      key !== "continue_on_error" ||
      getAutomationActionType(newAction) !== "condition"
  );
  const action = {
    ...newAction,
    ...deepClone(pickRowConfig(oldAction, keys)),
  } as Action;

  const service = isServiceAction(action)
    ? getService(registries.services, action.action)
    : undefined;
  if (!service || !isServiceAction(action)) {
    return action;
  }

  const oldService = isServiceAction(oldAction) ? oldAction : undefined;
  const oldDescription = getService(registries.services, oldService?.action);
  const fields = getServiceFields(service);
  const data = fillFieldDefaults(
    portFields(
      oldService?.data,
      fields,
      oldDescription ? getServiceFields(oldDescription) : undefined
    ),
    Object.entries(fields),
    true
  ).values;

  const result: ServiceAction = {
    ...action,
    data,
    ...(oldService?.response_variable && service.response
      ? { response_variable: oldService.response_variable }
      : {}),
  };
  return setTarget(
    result,
    action.target ??
      portTarget(
        oldService && getServiceTarget(oldService),
        getTargetFilter(service),
        getTargetFilter(oldDescription),
        registries
      )
  );
};
