import { HomeAssistant } from "../types";

export const setInputDateTimeValue = (
  hass: HomeAssistant,
  entityId: string,
  time: string | undefined = undefined,
  date: string | undefined = undefined
) => {
  const param = { entity_id: entityId, time, date };
  hass.callService(entityId.split(".", 1)[0], "set_datetime", param);
};
