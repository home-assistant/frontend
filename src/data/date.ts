import { HassEntityBase } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

export const stateToIsoDateString = (entityState: HassEntityBase) =>
  `${entityState}T00:00:00`;

export const setDateValue = (
  hass: HomeAssistant,
  entityId: string,
  date: string | undefined = undefined
) => {
  const param = { entity_id: entityId, date };
  hass.callService("date", "set_value", param);
};
