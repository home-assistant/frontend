import { STATES_OFF } from "../../../../common/const.js";
import turnOnOffEntity from "./turn-on-off-entity.js";

export default function toggleEntity(hass, entityId) {
  const turnOn = STATES_OFF.includes(hass.states[entityId].state);
  turnOnOffEntity(hass, entityId, turnOn);
}
