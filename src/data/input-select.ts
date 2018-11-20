import { HomeAssistant } from "../types";

export const setOption = (
  hass: HomeAssistant,
  entity: string,
  option: string
) =>
  hass.callService("input_select", "select_option", {
    option,
    entity_id: entity,
  });
