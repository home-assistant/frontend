import { HomeAssistant } from "../types";
import compute_state_name from "../common/entity/compute_state_name";

export interface DeviceTrigger {
  platform: string;
  device_id: string;
  domain: string;
  entity_id: string;
  type?: string;
  event?: string;
}

export interface DeviceTriggerList {
  triggers: DeviceTrigger[];
}

export const fetchDeviceTriggers = (hass: HomeAssistant, deviceId: string) =>
  hass
    .callWS<DeviceTriggerList>({
      type: "device_automation/trigger/list",
      device_id: deviceId,
    })
    .then((response) => response.triggers);

export const deviceAutomationTriggersEqual = (
  a: DeviceTrigger,
  b: DeviceTrigger
) => {
  if (typeof a !== typeof b) {
    return false;
  }

  for (const property in a) {
    if (!Object.is(a[property], b[property])) {
      return false;
    }
  }
  for (const property in b) {
    if (!Object.is(a[property], b[property])) {
      return false;
    }
  }

  return true;
};

export const localizeDeviceAutomationTrigger = (
  hass: HomeAssistant,
  trigger: DeviceTrigger
) =>
  hass.localize(
    `component.${trigger.domain}.device_automation.trigger_type.${
      trigger.type
    }`,
    "name",
    trigger.entity_id ? compute_state_name(hass!.states[trigger.entity_id]) : ""
  );
