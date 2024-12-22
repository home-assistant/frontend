import { HomeAssistant } from "../types";

export const setTimeValue = (
  hass: HomeAssistant,
  entityId: string,
  time: string | undefined = undefined
) => {
  const param = { entity_id: entityId, time: time };
  hass.callService("time", "set_value", param);
};
