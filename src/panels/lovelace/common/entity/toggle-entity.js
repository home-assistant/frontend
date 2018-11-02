import { STATES_OFF } from "../../../../common/const";
import turnOnOffEntity from "./turn-on-off-entity";

export default function toggleEntity(hass, entityId) {
  const turnOn = STATES_OFF.includes(hass.states[entityId].state);
  turnOnOffEntity(hass, entityId, turnOn);
}
