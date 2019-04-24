import { HomeAssistant } from "../types";

export const setValue = (
  hass: HomeAssistant,
  entity: string,
  time: string | null = null,
  date: string | null = null
) => {
  const param = {
    entity_id: entity,
    ...(time !== null && { time }),
    ...(date !== null && { date }),
  };
  hass.callService(entity.split(".", 1)[0], "set_datetime", param);
};
