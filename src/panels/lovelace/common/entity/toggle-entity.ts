import { STATES_OFF } from "../../../../common/const";
import { turnOnOffEntity } from "./turn-on-off-entity";
import { HomeAssistant } from "../../../../types";

export const toggleEntity = (hass: HomeAssistant, entityId: string): void => {
  const turnOn = STATES_OFF.includes(hass.states[entityId].state);
  turnOnOffEntity(hass, entityId, turnOn);
};
