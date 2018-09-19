import canToggleState from './can_toggle_state.js';
import computeStateDomain from './compute_state_domain.js';
import { DOMAINS_WITH_CARD } from '../const.js';

export default function stateCardType(hass, stateObj) {
  if (stateObj.state === 'unavailable') {
    return 'display';
  }

  const domain = computeStateDomain(stateObj);

  if (DOMAINS_WITH_CARD.includes(domain)) {
    return domain;
  } if (canToggleState(hass, stateObj)
             && stateObj.attributes.control !== 'hidden') {
    return 'toggle';
  }
  return 'display';
}
