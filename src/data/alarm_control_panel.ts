import {
  mdiAirplane,
  mdiHome,
  mdiLock,
  mdiMoonWaningCrescent,
  mdiShield,
  mdiShieldOff,
} from "@mdi/js";
import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

export const FORMAT_TEXT = "text";
export const FORMAT_NUMBER = "number";

export const enum AlarmControlPanelEntityFeature {
  ARM_HOME = 1,
  ARM_AWAY = 2,
  ARM_NIGHT = 4,
  TRIGGER = 8,
  ARM_CUSTOM_BYPASS = 16,
  ARM_VACATION = 32,
}

interface AlarmControlPanelEntityAttributes extends HassEntityAttributeBase {
  code_format?: "text" | "number";
  changed_by?: string | null;
  code_arm_required?: boolean;
}

export interface AlarmControlPanelEntity extends HassEntityBase {
  attributes: AlarmControlPanelEntityAttributes;
}

export const callAlarmAction = (
  hass: HomeAssistant,
  entity: string,
  action:
    | "arm_away"
    | "arm_home"
    | "arm_night"
    | "arm_vacation"
    | "arm_custom_bypass"
    | "disarm",
  code?: string
) => {
  hass!.callService("alarm_control_panel", `alarm_${action}`, {
    entity_id: entity,
    code,
  });
};

export type AlarmMode =
  | "armed_home"
  | "armed_away"
  | "armed_night"
  | "armed_vacation"
  | "armed_custom_bypass"
  | "disarmed";

type AlarmConfig = {
  service: string;
  feature?: AlarmControlPanelEntityFeature;
  path: string;
};
export const ALARM_MODES: Record<AlarmMode, AlarmConfig> = {
  armed_home: {
    feature: AlarmControlPanelEntityFeature.ARM_HOME,
    service: "alarm_arm_home",
    path: mdiHome,
  },
  armed_away: {
    feature: AlarmControlPanelEntityFeature.ARM_AWAY,
    service: "alarm_arm_away",
    path: mdiLock,
  },
  armed_night: {
    feature: AlarmControlPanelEntityFeature.ARM_NIGHT,
    service: "alarm_arm_night",
    path: mdiMoonWaningCrescent,
  },
  armed_vacation: {
    feature: AlarmControlPanelEntityFeature.ARM_VACATION,
    service: "alarm_arm_vacation",
    path: mdiAirplane,
  },
  armed_custom_bypass: {
    feature: AlarmControlPanelEntityFeature.ARM_CUSTOM_BYPASS,
    service: "alarm_arm_custom_bypass",
    path: mdiShield,
  },
  disarmed: {
    service: "alarm_disarm",
    path: mdiShieldOff,
  },
};
