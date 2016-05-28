import canToggle from './can-toggle';

const DOMAINS_WITH_CARD = [
  'configurator',
  'hvac',
  'input_select',
  'input_slider',
  'media_player',
  'rollershutter',
  'scene',
  'script',
  'thermostat',
  'weblink',
];

export default function stateCardType(hass, state) {
  if (state.state === 'unavailable') {
    return 'display';
  } else if (DOMAINS_WITH_CARD.indexOf(state.domain) !== -1) {
    return state.domain;
  } else if (canToggle(hass, state.entityId)) {
    return 'toggle';
  }
  return 'display';
}
