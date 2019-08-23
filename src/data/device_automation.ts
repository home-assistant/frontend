import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { compare } from "../../common/string/compare";
import { LocalizeFunc } from "../../common/translations/localize";
import computeStateName from "../../common/entity/compute_state_name";

export interface DeviceTrigger {
  platform: string;
  domain: string;
  device_id: string;
  entity_id?: string;
  type: string;
}

export const fetchDeviceTriggers = (hass: HomeAssistant, deviceId: string) =>
  hass.callWS<DeviceTrigger[]>({
    type: "device_automation/list_triggers",
    device_id: deviceId,
  });

export const triggersEqual = (a: any, b: any) => {
  if (typeof a != typeof b) return false;

  for (var property in a) {
    if (!Object.is(a[property], b[property])) return false;
  }
  for (var property in b) {
    if (!Object.is(a[property], b[property])) return false;
  }

  return true;
};
