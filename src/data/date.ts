import type { HassEntityBase } from "home-assistant-js-websocket";
import type { HomeAssistantApi } from "../types";

export const stateToIsoDateString = (entityState: HassEntityBase) =>
  `${entityState}T00:00:00`;

export const setDateValue = (
  callService: HomeAssistantApi["callService"],
  entityId: string,
  date: string | undefined = undefined
) => {
  const param = { entity_id: entityId, date };
  callService("date", "set_value", param);
};
