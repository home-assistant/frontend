import type { HomeAssistantApi } from "../types";

export const setTimeValue = (
  callService: HomeAssistantApi["callService"],
  entityId: string,
  time: string | undefined = undefined
) => {
  const param = { entity_id: entityId, time: time };
  callService("time", "set_value", param);
};
