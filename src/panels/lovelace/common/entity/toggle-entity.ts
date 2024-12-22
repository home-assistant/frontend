import { STATES_OFF } from "../../../../common/const";
import { HomeAssistant, ServiceCallResponse } from "../../../../types";
import { turnOnOffEntity } from "./turn-on-off-entity";

export const toggleEntity = (
  hass: HomeAssistant,
  entityId: string
): Promise<ServiceCallResponse> => {
  const turnOn = STATES_OFF.includes(hass.states[entityId].state);
  return turnOnOffEntity(hass, entityId, turnOn);
};
