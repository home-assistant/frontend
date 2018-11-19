import { HomeAssistant } from "../types";

export const setValue = (
  hass: HomeAssistant,
  entity: string,
  value: string
) => {
  hass.callService("input_text", "set_value", {
    value,
    entity_id: entity,
  });
};
