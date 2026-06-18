import type { HomeAssistantApi } from "../types";

export const setDateTimeValue = (
  callService: HomeAssistantApi["callService"],
  entityId: string,
  datetime: Date
) => {
  callService("datetime", "set_value", {
    entity_id: entityId,
    datetime: datetime.toISOString(),
  });
};
