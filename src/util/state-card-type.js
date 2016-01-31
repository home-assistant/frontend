import canToggle from './can-toggle';

const DOMAINS_WITH_CARD = [
  'configurator',
  'media_player',
  'rollershutter',
  'scene',
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
