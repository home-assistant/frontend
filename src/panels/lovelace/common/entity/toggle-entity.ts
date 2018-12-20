import { STATES_OFF } from "../../../../common/const";
import { turnOnOffEntity } from "./turn-on-off-entity";
import { HomeAssistant } from "../../../../types";
export const toggleEntity = (
  hass: HomeAssistant,
  entityId: string,
  toast = true
): Promise<void> => {
  const turnOn = STATES_OFF.includes(hass.states[entityId].state);
  return turnOnOffEntity(hass, entityId, turnOn, toast);
};
