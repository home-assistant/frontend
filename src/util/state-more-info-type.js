const DOMAINS_WITH_MORE_INFO = [
  'light', 'group', 'sun', 'configurator', 'thermostat', 'script',
  'media_player', 'camera', 'updater',
];

export default function stateMoreInfoType(state) {
  if (DOMAINS_WITH_MORE_INFO.indexOf(state.domain) !== -1) {
    return state.domain;
  }
  return 'default';
}
