import { HomeAssistant } from "../types";

export const setTimeValue = (
  hass: HomeAssistant,
  entityId: string,
  time: string | undefined = undefined
) => {
  const param = { entity_id: entityId, time: time };
  hass.callService(entityId.split(".", 1)[0], "set_value", param);
};
