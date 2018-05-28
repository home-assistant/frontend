/**
 * Return the icon to be used for a domain.
 *
 * Optionally pass in a state to influence the domain icon.
 */
import { DEFAULT_DOMAIN_ICON } from '../const.js';

const fixedIcons = {
  automation: 'hass:playlist-play',
  calendar: 'hass:calendar',
  camera: 'hass:video',
  climate: 'hass:thermostat',
  configurator: 'hass:settings',
  conversation: 'hass:text-to-speech',
  device_tracker: 'hass:account',
  fan: 'hass:fan',
  group: 'hass:google-circles-communities',
  history_graph: 'hass:chart-line',
  homeassistant: 'hass:home-assistant',
  image_processing: 'hass:image-filter-frames',
  input_boolean: 'hass:drawing',
  input_datetime: 'hass:calendar-clock',
  input_number: 'hass:ray-vertex',
  input_select: 'hass:format-list-bulleted',
  input_text: 'hass:textbox',
  light: 'hass:lightbulb',
  mailbox: 'hass:mailbox',
  notify: 'hass:comment-alert',
  plant: 'hass:flower',
  proximity: 'hass:apple-safari',
  remote: 'hass:remote',
  scene: 'hass:google-pages',
  script: 'hass:file-document',
  sensor: 'hass:eye',
  simple_alarm: 'hass:bell',
  sun: 'hass:white-balance-sunny',
  switch: 'hass:flash',
  timer: 'hass:timer',
  updater: 'hass:cloud-upload',
  vacuum: 'hass:robot-vacuum',
  weblink: 'hass:open-in-new',
};

export default function domainIcon(domain, state) {
  if (domain in fixedIcons) {
    return fixedIcons[domain];
  }

  switch (domain) {
    case 'alarm_control_panel':
      switch (state) {
        case 'armed_home':
          return 'hass:bell-plus';
        case 'armed_night':
          return 'hass:bell-sleep';
        case 'disarmed':
          return 'hass:bell-outline';
        case 'triggered':
          return 'hass:bell-ring';
        default:
          return 'hass:bell';
      }

    case 'binary_sensor':
      return state && state === 'off' ? 'hass:radiobox-blank' : 'hass:checkbox-marked-circle';

    case 'cover':
      return state === 'closed' ? 'hass:window-closed' : 'hass:window-open';

    case 'lock':
      return state && state === 'unlocked' ? 'hass:lock-open' : 'hass:lock';

    case 'media_player':
      return state && state !== 'off' && state !== 'idle' ?
        'hass:cast-connected' : 'hass:cast';

    case 'zwave':
      switch (state) {
        case 'dead':
          return 'hass:emoticon-dead';
        case 'sleeping':
          return 'hass:sleep';
        case 'initializing':
          return 'hass:timer-sand';
        default:
          return 'hass:nfc';
      }

    default:
      /* eslint-disable no-console */
      console.warn('Unable to find icon for domain ' + domain + ' (' + state + ')');
      /* eslint-enable no-console */
      return DEFAULT_DOMAIN_ICON;
  }
}
