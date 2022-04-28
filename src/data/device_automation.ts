import { computeStateName } from "../common/entity/compute_state_name";
import type { HaFormSchema } from "../components/ha-form/types";
import { HomeAssistant } from "../types";
import { BaseTrigger } from "./automation";

export interface DeviceAutomation {
  alias?: string;
  device_id: string;
  domain: string;
  entity_id?: string;
  type?: string;
  subtype?: string;
  event?: string;
  enabled?: boolean;
  metadata?: { secondary: boolean };
}

export interface DeviceAction extends DeviceAutomation {
  entity_id: string;
}

export interface DeviceCondition extends DeviceAutomation {
  condition: "device";
}

export type DeviceTrigger = DeviceAutomation &
  BaseTrigger & {
    platform: "device";
  };

export interface DeviceCapabilities {
  extra_fields: HaFormSchema[];
}

export const fetchDeviceActions = (hass: HomeAssistant, deviceId: string) =>
  hass.callWS<DeviceAction[]>({
    type: "device_automation/action/list",
    device_id: deviceId,
  });

export const fetchDeviceConditions = (hass: HomeAssistant, deviceId: string) =>
  hass.callWS<DeviceCondition[]>({
    type: "device_automation/condition/list",
    device_id: deviceId,
  });

export const fetchDeviceTriggers = (hass: HomeAssistant, deviceId: string) =>
  hass.callWS<DeviceTrigger[]>({
    type: "device_automation/trigger/list",
    device_id: deviceId,
  });

export const fetchDeviceActionCapabilities = (
  hass: HomeAssistant,
  action: DeviceAction
) =>
  hass.callWS<DeviceCapabilities>({
    type: "device_automation/action/capabilities",
    action,
  });

export const fetchDeviceConditionCapabilities = (
  hass: HomeAssistant,
  condition: DeviceCondition
) =>
  hass.callWS<DeviceCapabilities>({
    type: "device_automation/condition/capabilities",
    condition,
  });

export const fetchDeviceTriggerCapabilities = (
  hass: HomeAssistant,
  trigger: DeviceTrigger
) =>
  hass.callWS<DeviceCapabilities>({
    type: "device_automation/trigger/capabilities",
    trigger,
  });

const deviceAutomationIdentifiers = [
  "device_id",
  "domain",
  "entity_id",
  "type",
  "subtype",
  "event",
  "condition",
  "platform",
];

export const deviceAutomationsEqual = (
  a: DeviceAutomation,
  b: DeviceAutomation
) => {
  if (typeof a !== typeof b) {
    return false;
  }

  for (const property in a) {
    if (!deviceAutomationIdentifiers.includes(property)) {
      continue;
    }
    if (!Object.is(a[property], b[property])) {
      return false;
    }
  }
  for (const property in b) {
    if (!deviceAutomationIdentifiers.includes(property)) {
      continue;
    }
    if (!Object.is(a[property], b[property])) {
      return false;
    }
  }

  return true;
};

export const localizeDeviceAutomationAction = (
  hass: HomeAssistant,
  action: DeviceAction
): string => {
  const state = action.entity_id ? hass.states[action.entity_id] : undefined;
  return (
    hass.localize(
      `component.${action.domain}.device_automation.action_type.${action.type}`,
      "entity_name",
      state ? computeStateName(state) : action.entity_id || "<unknown>",
      "subtype",
      action.subtype
        ? hass.localize(
            `component.${action.domain}.device_automation.action_subtype.${action.subtype}`
          ) || action.subtype
        : ""
    ) || (action.subtype ? `"${action.subtype}" ${action.type}` : action.type!)
  );
};

export const localizeDeviceAutomationCondition = (
  hass: HomeAssistant,
  condition: DeviceCondition
): string => {
  const state = condition.entity_id
    ? hass.states[condition.entity_id]
    : undefined;
  return (
    hass.localize(
      `component.${condition.domain}.device_automation.condition_type.${condition.type}`,
      "entity_name",
      state ? computeStateName(state) : condition.entity_id || "<unknown>",
      "subtype",
      condition.subtype
        ? hass.localize(
            `component.${condition.domain}.device_automation.condition_subtype.${condition.subtype}`
          ) || condition.subtype
        : ""
    ) ||
    (condition.subtype
      ? `"${condition.subtype}" ${condition.type}`
      : condition.type!)
  );
};

export const localizeDeviceAutomationTrigger = (
  hass: HomeAssistant,
  trigger: DeviceTrigger
): string => {
  const state = trigger.entity_id ? hass.states[trigger.entity_id] : undefined;
  return (
    hass.localize(
      `component.${trigger.domain}.device_automation.trigger_type.${trigger.type}`,
      "entity_name",
      state ? computeStateName(state) : trigger.entity_id || "<unknown>",
      "subtype",
      trigger.subtype
        ? hass.localize(
            `component.${trigger.domain}.device_automation.trigger_subtype.${trigger.subtype}`
          ) || trigger.subtype
        : ""
    ) ||
    (trigger.subtype ? `"${trigger.subtype}" ${trigger.type}` : trigger.type!)
  );
};

export const sortDeviceAutomations = (
  automationA: DeviceAutomation,
  automationB: DeviceAutomation
) => {
  if (automationA.metadata?.secondary && !automationB.metadata?.secondary) {
    return 1;
  }
  if (!automationA.metadata?.secondary && automationB.metadata?.secondary) {
    return -1;
  }
  return 0;
};
