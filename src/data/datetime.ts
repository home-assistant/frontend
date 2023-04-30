import { HomeAssistant } from "../types";

export const setDateTimeValue = (
  hass: HomeAssistant,
  entityId: string,
  date: string | undefined = undefined,
  time: string | undefined = undefined
) => {
  const param = { entity_id: entityId, date: date, time: time };
  hass.callService(entityId.split(".", 1)[0], "set_value", param);
};
