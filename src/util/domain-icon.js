import defaultIcon from './default-icon';

export default function domainIcon(domain, state) {
  switch (domain) {
    case 'alarm_control_panel':
      return state && state === 'disarmed' ? 'mdi:bell-outline' : 'mdi:bell';

    case 'automation':
      return 'mdi:playlist-play';

    case 'binary_sensor':
      return state && state === 'off' ? 'mdi:radiobox-blank' : 'mdi:checkbox-marked-circle';

    case 'camera':
      return 'mdi:video';

    case 'configurator':
      return 'mdi:settings';

    case 'conversation':
      return 'mdi:text-to-speech';

    case 'device_tracker':
      return 'mdi:account';

    case 'garage_door':
      return 'mdi:glassdoor';

    case 'group':
      return 'mdi:google-circles-communities';

    case 'homeassistant':
      return 'mdi:home';

    case 'input_boolean':
      return 'mdi:drawing';

    case 'input_select':
      return 'mdi:format-list-bulleted';

    case 'input_slider':
      return 'mdi:ray-vertex';

    case 'light':
      return 'mdi:lightbulb';

    case 'lock':
      return state && state === 'unlocked' ? 'mdi:lock-open' : 'mdi:lock';

    case 'media_player':
      return state && state !== 'off' && state !== 'idle' ?
        'mdi:cast-connected' : 'mdi:cast';

    case 'notify':
      return 'mdi:comment-alert';

    case 'proximity':
      return 'mdi:apple-safari';

    case 'rollershutter':
      return state && state === 'open' ? 'mdi:window-open' : 'mdi:window-closed';

    case 'scene':
      return 'mdi:google-pages';

    case 'script':
      return 'mdi:file-document';

    case 'sensor':
      return 'mdi:eye';

    case 'simple_alarm':
      return 'mdi:bell';

    case 'sun':
      return 'mdi:white-balance-sunny';

    case 'switch':
      return 'mdi:flash';

    case 'thermostat':
      return 'mdi:nest-thermostat';

    case 'updater':
      return 'mdi:cloud-upload';

    case 'weblink':
      return 'mdi:open-in-new';

    default:
    /* eslint-disable no-console */
      console.warn(`Unable to find icon for domain ${domain} (${state})`);
    /* eslint-enable no-console */
      return defaultIcon;
  }
}
