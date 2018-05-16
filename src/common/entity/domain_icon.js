/**
 * Return the icon to be used for a domain.
 *
 * Optionally pass in a state to influence the domain icon.
 */
import { DEFAULT_DOMAIN_ICON } from '../const.js';

const fixedIcons = {
  automation: 'mdi:playlist-play',
  calendar: 'mdi:calendar',
  camera: 'mdi:video',
  climate: 'mdi:thermostat',
  configurator: 'mdi:settings',
  conversation: 'mdi:text-to-speech',
  device_tracker: 'mdi:account',
  fan: 'mdi:fan',
  group: 'mdi:google-circles-communities',
  history_graph: 'mdi:chart-line',
  homeassistant: 'mdi:home-assistant',
  image_processing: 'mdi:image-filter-frames',
  input_boolean: 'mdi:drawing',
  input_datetime: 'mdi:calendar-clock',
  input_number: 'mdi:ray-vertex',
  input_select: 'mdi:format-list-bulleted',
  input_text: 'mdi:textbox',
  light: 'mdi:lightbulb',
  mailbox: 'mdi:mailbox',
  notify: 'mdi:comment-alert',
  plant: 'mdi:flower',
  proximity: 'mdi:apple-safari',
  remote: 'mdi:remote',
  scene: 'mdi:google-pages',
  script: 'mdi:file-document',
  sensor: 'mdi:eye',
  simple_alarm: 'mdi:bell',
  sun: 'mdi:white-balance-sunny',
  switch: 'mdi:flash',
  timer: 'mdi:timer',
  updater: 'mdi:cloud-upload',
  vacuum: 'mdi:robot-vacuum',
  weblink: 'mdi:open-in-new',
};

export default function domainIcon(domain, state) {
  if (domain in fixedIcons) {
    return fixedIcons[domain];
  }

  switch (domain) {
    case 'alarm_control_panel':
      switch (state) {
        case 'armed_home':
          return 'mdi:bell-plus';
        case 'armed_night':
          return 'mdi:bell-sleep';
        case 'disarmed':
          return 'mdi:bell-outline';
        case 'triggered':
          return 'mdi:bell-ring';
        default:
          return 'mdi:bell';
      }

    case 'binary_sensor':
      return state && state === 'off' ? 'mdi:radiobox-blank' : 'mdi:checkbox-marked-circle';

    case 'cover':
      return state && state === 'open' ? 'mdi:window-open' : 'mdi:window-closed';

    case 'lock':
      return state && state === 'unlocked' ? 'mdi:lock-open' : 'mdi:lock';

    case 'media_player':
      return state && state !== 'off' && state !== 'idle' ?
        'mdi:cast-connected' : 'mdi:cast';

    case 'zwave':
      switch (state) {
        case 'dead':
          return 'mdi:emoticon-dead';
        case 'sleeping':
          return 'mdi:sleep';
        case 'initializing':
          return 'mdi:timer-sand';
        default:
          return 'mdi:nfc';
      }

    default:
      /* eslint-disable no-console */
      console.warn('Unable to find icon for domain ' + domain + ' (' + state + ')');
      /* eslint-enable no-console */
      return DEFAULT_DOMAIN_ICON;
  }
}
