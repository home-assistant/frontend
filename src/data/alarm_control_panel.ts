import { HomeAssistant } from "../types";

export const callAlarmAction = (
  hass: HomeAssistant,
  entity: string,
  action: string,
  code: string
) => {
  hass!.callService("alarm_control_panel", "alarm_" + action, {
    entity_id: entity,
    code,
  });
};
