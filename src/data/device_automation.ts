import { HomeAssistant } from "../types";
import { computeStateName } from "../common/entity/compute_state_name";

export interface DeviceAutomation {
  device_id: string;
  domain: string;
  entity_id: string;
  type?: string;
  subtype?: string;
  event?: string;
}

// tslint:disable-next-line: no-empty-interface
export interface DeviceAction extends DeviceAutomation {}

export interface DeviceCondition extends DeviceAutomation {
  condition: string;
}

export interface DeviceTrigger extends DeviceAutomation {
  platform: "device";
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
  hass.callWS<DeviceAction[]>({
    type: "device_automation/action/capabilities",
    action,
  });

export const fetchDeviceConditionCapabilities = (
  hass: HomeAssistant,
  condition: DeviceCondition
) =>
  hass.callWS<DeviceCondition[]>({
    type: "device_automation/condition/capabilities",
    condition,
  });

export const fetchDeviceTriggerCapabilities = (
  hass: HomeAssistant,
  trigger: DeviceTrigger
) =>
  hass.callWS<DeviceTrigger[]>({
    type: "device_automation/trigger/capabilities",
    trigger,
  });

const whitelist = ["above", "below", "code", "for"];

export const deviceAutomationsEqual = (
  a: DeviceAutomation,
  b: DeviceAutomation
) => {
  if (typeof a !== typeof b) {
    return false;
  }

  for (const property in a) {
    if (whitelist.includes(property)) {
      continue;
    }
    if (!Object.is(a[property], b[property])) {
      return false;
    }
  }
  for (const property in b) {
    if (whitelist.includes(property)) {
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
) => {
  const state = action.entity_id ? hass.states[action.entity_id] : undefined;
  return (
    hass.localize(
      `component.${action.domain}.device_automation.action_type.${action.type}`,
      "entity_name",
      state ? computeStateName(state) : "<unknown>",
      "subtype",
      hass.localize(
        `component.${action.domain}.device_automation.action_subtype.${action.subtype}`
      ) || action.subtype
    ) || `"${action.subtype}" ${action.type}`
  );
};

export const localizeDeviceAutomationCondition = (
  hass: HomeAssistant,
  condition: DeviceCondition
) => {
  const state = condition.entity_id
    ? hass.states[condition.entity_id]
    : undefined;
  return (
    hass.localize(
      `component.${condition.domain}.device_automation.condition_type.${condition.type}`,
      "entity_name",
      state ? computeStateName(state) : "<unknown>",
      "subtype",
      hass.localize(
        `component.${condition.domain}.device_automation.condition_subtype.${condition.subtype}`
      ) || condition.subtype
    ) || `"${condition.subtype}" ${condition.type}`
  );
};

export const localizeDeviceAutomationTrigger = (
  hass: HomeAssistant,
  trigger: DeviceTrigger
) => {
  const state = trigger.entity_id ? hass.states[trigger.entity_id] : undefined;
  return (
    hass.localize(
      `component.${trigger.domain}.device_automation.trigger_type.${trigger.type}`,
      "entity_name",
      state ? computeStateName(state) : "<unknown>",
      "subtype",
      hass.localize(
        `component.${trigger.domain}.device_automation.trigger_subtype.${trigger.subtype}`
      ) || trigger.subtype
    ) || `"${trigger.subtype}" ${trigger.type}`
  );
};
