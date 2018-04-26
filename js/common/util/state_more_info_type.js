import computeStateDomain from './compute_state_domain.js';

const DOMAINS_WITH_MORE_INFO = [
  'alarm_control_panel', 'automation', 'camera', 'climate', 'configurator',
  'cover', 'fan', 'group', 'history_graph', 'light', 'lock', 'media_player', 'script',
  'sun', 'updater', 'vacuum', 'input_datetime', 'weather'
];

const HIDE_MORE_INFO = [
  'input_select', 'scene', 'input_number', 'input_text'
];

export default function stateMoreInfoType(stateObj) {
  const domain = computeStateDomain(stateObj);

  if (DOMAINS_WITH_MORE_INFO.includes(domain)) {
    return domain;
  }
  if (HIDE_MORE_INFO.includes(domain)) {
    return 'hidden';
  }
  return 'default';
}
