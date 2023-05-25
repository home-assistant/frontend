import { HomeAssistant } from "../types";

export const setDateTimeValue = (
  hass: HomeAssistant,
  entityId: string,
  datetime: string
) => {
  hass.callService(entityId.split(".", 1)[0], "set_value", {
    entity_id: entityId,
    datetime,
  });
};
