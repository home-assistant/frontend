import canToggle from './can-toggle';

const DOMAINS_WITH_CARD = [
  'configurator',
  'input_select',
  'media_player',
  'rollershutter',
  'scene',
  'script',
  'thermostat',
  'weblink',
];

export default function stateCardType(state) {
  if (DOMAINS_WITH_CARD.indexOf(state.domain) !== -1) {
    return state.domain;
  } else if (canToggle(state.entityId)) {
    return 'toggle';
  }
  return 'display';
}
