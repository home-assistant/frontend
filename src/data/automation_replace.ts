import deepClone from "deep-clone-simple";
import type {
  HassService,
  HassServiceTarget,
} from "home-assistant-js-websocket";
import { ensureArray } from "../common/array/ensure-array";
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
import type { Selector, TargetSelector } from "./selector";
import {
  areaMeetsTargetSelector,
  deviceMeetsTargetSelector,
  entityMeetsTargetSelector,
  expandFloorTarget,
  expandLabelTarget,
  filterSelectorEntities,
  handleLegacyEntitySelector,
} from "./selector";
import type { TriggerDescriptions } from "./trigger";
import { isTriggerList } from "./trigger";

// Replacing an item swaps it for one of another type and carries over the
// configuration that is valid for the new type. Values are only carried over
// when the new type declares a field with the same key and the value fits that
// field. Everything else is dropped, even if that leaves the new item
// incomplete: an incomplete item is visible, an invalid value might not be.

interface Field {
  selector?: Selector;
  required?: boolean;
  default?: unknown;
}

type Fields = Record<string, Field>;

// `undefined` when the item doesn't take a target.
type TargetFilter = NonNullable<TargetSelector["target"]> | undefined;

// The alias describes what the old item did, so it would mislabel the new one.
const keptKeys = (keys: readonly string[]) =>
  keys.filter((key) => key !== "alias");

const TIME_REGEX = /^\d{1,2}:\d{2}(:\d{2})?$/;

const DURATION_KEYS = ["days", "hours", "minutes", "seconds", "milliseconds"];

// Same semantics as the HTML `pattern` attribute the text selector uses.
const matchesPattern = (value: string, pattern: string) => {
  try {
    return new RegExp(`^(?:${pattern})$`, "v").test(value);
  } catch (_err) {
    return false;
  }
};

const fitsSelector = (
  value: unknown,
  selector: Selector,
  oldSelector: Selector | undefined,
  hass: HomeAssistant
): boolean => {
  if ("boolean" in selector) {
    return typeof value === "boolean";
  }
  if ("number" in selector) {
    const config = selector.number;
    const oldUnit =
      oldSelector && "number" in oldSelector
        ? oldSelector.number?.unit_of_measurement
        : undefined;
    return (
      typeof value === "number" &&
      oldUnit === config?.unit_of_measurement &&
      (config?.min === undefined || value >= config.min) &&
      (config?.max === undefined || value <= config.max)
    );
  }
  if ("text" in selector) {
    const values = selector.text?.multiple ? ensureArray(value) : [value];
    const pattern = selector.text?.pattern;
    return values.every(
      (item) =>
        typeof item === "string" && (!pattern || matchesPattern(item, pattern))
    );
  }
  if ("select" in selector) {
    const config = selector.select;
    const options = (config?.options ?? []).map((option) =>
      typeof option === "string" ? option : option.value
    );
    const values = config?.multiple ? ensureArray(value) : [value];
    return values.every(
      (item) =>
        typeof item === "string" &&
        (config?.custom_value || options.includes(item))
    );
  }
  if ("duration" in selector) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const allowNegative =
      selector.duration?.allow_negative || selector.duration?.mode === "signed";
    return Object.entries(value).every(
      ([key, item]) =>
        DURATION_KEYS.includes(key) &&
        typeof item === "number" &&
        (allowNegative || item >= 0)
    );
  }
  if ("time" in selector) {
    return typeof value === "string" && TIME_REGEX.test(value);
  }
  if ("entity" in selector) {
    const config = handleLegacyEntitySelector(selector).entity;
    const values = config?.multiple ? ensureArray(value) : [value];
    return values.every((item) => {
      const stateObj = typeof item === "string" ? hass.states[item] : undefined;
      if (!stateObj || config?.exclude_entities?.includes(stateObj.entity_id)) {
        return false;
      }
      if (config?.include_entities) {
        return config.include_entities.includes(stateObj.entity_id);
      }
      return (
        !config?.filter ||
        ensureArray(config.filter).some((filter) =>
          filterSelectorEntities(
            filter,
            stateObj,
            undefined,
            hass.entities,
            hass.devices
          )
        )
      );
    });
  }
  if ("color_rgb" in selector) {
    return (
      Array.isArray(value) &&
      value.length === 3 &&
      value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)
    );
  }
  if ("color_temp" in selector) {
    const config = selector.color_temp;
    const unit = config?.unit ?? "mired";
    const oldUnit =
      oldSelector && "color_temp" in oldSelector
        ? (oldSelector.color_temp?.unit ?? "mired")
        : undefined;
    const min =
      unit === "kelvin" ? config?.min : (config?.min ?? config?.min_mireds);
    const max =
      unit === "kelvin" ? config?.max : (config?.max ?? config?.max_mireds);
    return (
      typeof value === "number" &&
      oldUnit === unit &&
      (min === undefined || value >= min) &&
      (max === undefined || value <= max)
    );
  }
  // Without a check for this selector type, the value can't be shown to fit.
  return false;
};

const valueFitsField = (
  value: unknown,
  selector: Selector,
  oldSelector: Selector | undefined,
  hass: HomeAssistant
): boolean => {
  // The value was set through an identical field, templates included.
  if (oldSelector && deepEqual(oldSelector, selector)) {
    return true;
  }
  if (hasTemplate(value)) {
    return false;
  }
  return fitsSelector(value, selector, oldSelector, hass);
};

const portFields = (
  values: Record<string, unknown> | undefined,
  fields: Fields,
  oldFields: Fields | undefined,
  hass: HomeAssistant
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  Object.entries(fields).forEach(([key, field]) => {
    const value = values?.[key];
    if (
      value !== undefined &&
      field.selector &&
      valueFitsField(value, field.selector, oldFields?.[key]?.selector, hass)
    ) {
      result[key] = deepClone(value);
    }
  });
  return result;
};

// Fill the defaults the editors would fill for a new item, so they don't
// change the replaced item again, which would add a second undo step.
const fillDefaults = (
  values: Record<string, unknown>,
  fields: Fields,
  skip?: (field: Field) => boolean
) => {
  Object.entries(fields).forEach(([key, field]) => {
    if (!field.selector || values[key] !== undefined) {
      return;
    }
    if (
      field.required &&
      field.default === undefined &&
      "boolean" in field.selector
    ) {
      values[key] = false;
    } else if (field.default !== undefined && !skip?.(field)) {
      values[key] = deepClone(field.default);
    }
  });
};

const TARGET_KEYS = [
  "entity_id",
  "device_id",
  "area_id",
  "floor_id",
  "label_id",
] as const;

const portTarget = (
  target: HassServiceTarget | string | undefined,
  filter: TargetFilter,
  oldFilter: TargetFilter,
  hass: HomeAssistant
): HassServiceTarget | undefined => {
  if (!target || filter === undefined) {
    return undefined;
  }
  if (oldFilter !== undefined && deepEqual(oldFilter, filter)) {
    return deepClone(target as HassServiceTarget);
  }
  if (typeof target === "string" || hasTemplate(target)) {
    return undefined;
  }

  const selector: TargetSelector = { target: filter };
  const matches: Record<(typeof TARGET_KEYS)[number], (id: string) => boolean> =
    {
      entity_id: (id) =>
        entityMeetsTargetSelector(
          hass.states[id],
          selector,
          undefined,
          hass.entities,
          hass.devices
        ),
      device_id: (id) =>
        id in hass.devices &&
        deviceMeetsTargetSelector(
          hass.states,
          Object.values(hass.entities),
          hass.devices[id],
          selector
        ),
      area_id: (id) =>
        areaMeetsTargetSelector(
          hass,
          hass.entities,
          hass.devices,
          id,
          selector
        ),
      floor_id: (id) =>
        expandFloorTarget(hass, id, hass.areas, selector).areas.length > 0,
      label_id: (id) => {
        const { areas, devices, entities } = expandLabelTarget(
          hass,
          id,
          hass.areas,
          hass.devices,
          hass.entities,
          selector
        );
        return areas.length + devices.length + entities.length > 0;
      },
    };

  const result: HassServiceTarget = {};
  TARGET_KEYS.forEach((key) => {
    const value = target[key];
    if (!value) {
      return;
    }
    const kept = ensureArray(value).filter(matches[key]);
    if (kept.length) {
      result[key] = Array.isArray(value) ? kept : kept[0];
    }
  });
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
  hass: HomeAssistant
): T => {
  const target =
    item.target ??
    portTarget(
      old?.target,
      getTargetFilter(description),
      getTargetFilter(old?.description),
      hass
    );
  const fields = description.fields ?? {};
  const options = portFields(
    old?.options,
    fields,
    old?.description?.fields,
    hass
  );
  fillDefaults(
    options,
    fields,
    (field) => isAutomationBehavior(field) && !!description.target && !target
  );
  return setTarget({ ...item, options }, target);
};

export const portTrigger = (
  oldTrigger: Trigger,
  newTrigger: Trigger,
  hass: HomeAssistant,
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
    hass
  );
};

export const portCondition = (
  oldCondition: Condition,
  newCondition: Condition,
  hass: HomeAssistant,
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
    hass
  );
};

interface ServiceFieldWithSection extends Field {
  fields?: Fields;
}

const getService = (
  hass: HomeAssistant,
  action: string | undefined
): HassService | undefined => {
  if (!action?.includes(".")) {
    return undefined;
  }
  return hass.services[computeDomain(action)]?.[computeObjectId(action)];
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
  (["entity_id", "device_id", "area_id"] as const).forEach((key) => {
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
  hass: HomeAssistant
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
    ? getService(hass, action.action)
    : undefined;
  if (!service || !isServiceAction(action)) {
    return action;
  }

  const oldService = isServiceAction(oldAction) ? oldAction : undefined;
  const oldDescription = getService(hass, oldService?.action);
  const fields = getServiceFields(service);
  const data = portFields(
    oldService?.data,
    fields,
    oldDescription ? getServiceFields(oldDescription) : undefined,
    hass
  );
  fillDefaults(data, fields);

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
        hass
      )
  );
};
