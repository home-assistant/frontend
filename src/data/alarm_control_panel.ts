import { HomeAssistant } from "../types";

export const callAlarmAction = (
  hass: HomeAssistant,
  entity: string,
  action:
    | "arm_away"
    | "arm_home"
    | "arm_night"
    | "arm_custom_bypass"
    | "disarm",
  code: string
) => {
  hass!.callService("alarm_control_panel", "alarm_" + action, {
    entity_id: entity,
    code,
  });
};
