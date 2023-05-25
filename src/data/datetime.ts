import { HomeAssistant } from "../types";

export const setDateTimeValue = (
  hass: HomeAssistant,
  entityId: string,
  datetime: Date
) => {
  hass.callService("datetime", "set_value", {
    entity_id: entityId,
    datetime: datetime.toISOString(),
  });
};
