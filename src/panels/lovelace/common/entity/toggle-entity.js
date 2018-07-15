import { STATES_OFF } from '../../../../common/const.js';
import turnOnOffEntity from './turn-on-off-entity.js';

export default function toggleEntity(hass, entityId) {
  const turnOn = entityId.split('.', 1)[0] === 'scene' ?
    true : STATES_OFF.includes(hass.states[entityId].state);
  turnOnOffEntity(hass, entityId, turnOn);
}
