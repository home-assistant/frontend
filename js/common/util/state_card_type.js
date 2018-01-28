import canToggleState from './can_toggle_state.js';
import computeStateDomain from './compute_state_domain.js';

const DOMAINS_WITH_CARD = [
  'climate',
  'cover',
  'configurator',
  'input_select',
  'input_number',
  'input_text',
  'media_player',
  'scene',
  'lock',
  'script',
  'timer',
  'weblink',
];

export default function stateCardType(hass, stateObj) {
  if (stateObj.state === 'unavailable') {
    return 'display';
  }

  const domain = computeStateDomain(stateObj);

  if (DOMAINS_WITH_CARD.includes(domain)) {
    return domain;
  } else if (canToggleState(hass, stateObj) &&
             stateObj.attributes.control !== 'hidden') {
    return 'toggle';
  }
  return 'display';
}
