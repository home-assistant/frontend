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
  | "away"
  | "home"
  | "night"
  | "vacation"
  | "custom_bypass"
  | "disarmed";

type AlarmConfig = {
  service: string;
  feature?: AlarmControlPanelEntityFeature;
  state: string;
  path: string;
};
export const ALARM_MODES: Record<AlarmMode, AlarmConfig> = {
  away: {
    feature: AlarmControlPanelEntityFeature.ARM_AWAY,
    service: "alarm_arm_away",
    state: "armed_away",
    path: mdiLock,
  },
  home: {
    feature: AlarmControlPanelEntityFeature.ARM_HOME,
    service: "alarm_arm_home",
    state: "armed_home",
    path: mdiHome,
  },
  custom_bypass: {
    feature: AlarmControlPanelEntityFeature.ARM_CUSTOM_BYPASS,
    service: "alarm_arm_custom_bypass",
    state: "armed_custom_bypass",
    path: mdiShield,
  },
  night: {
    feature: AlarmControlPanelEntityFeature.ARM_NIGHT,
    service: "alarm_arm_night",
    state: "armed_night",
    path: mdiMoonWaningCrescent,
  },
  vacation: {
    feature: AlarmControlPanelEntityFeature.ARM_VACATION,
    service: "alarm_arm_vacation",
    state: "armed_vacation",
    path: mdiAirplane,
  },
  disarmed: {
    service: "alarm_disarm",
    state: "disarmed",
    path: mdiShieldOff,
  },
};
