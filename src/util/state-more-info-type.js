const DOMAINS_WITH_MORE_INFO = [
  'light', 'group', 'sun', 'configurator', 'thermostat', 'script',
  'media_player', 'camera', 'updater', 'alarm_control_panel', 'lock',
  'hvac',
];

const HIDE_MORE_INFO = [
  'input_select', 'scene', 'script', 'input_slider',
];

export default function stateMoreInfoType(state) {
  if (DOMAINS_WITH_MORE_INFO.indexOf(state.domain) !== -1) {
    return state.domain;
  }
  if (HIDE_MORE_INFO.indexOf(state.domain) !== -1) {
    return 'hidden';
  }
  return 'default';
}
