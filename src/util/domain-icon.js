import defaultIcon from './default-icon';

export default function domainIcon(domain, state) {
  switch (domain) {
  case 'alarm_control_panel':
    return state && state === 'disarmed' ? 'mdi:lock-open' : 'mdi:lock';

  case 'camera':
    return 'mdi:video';

  case 'configurator':
    return 'mdi:settings';

  case 'conversation':
    return 'mdi:text-to-speech';

  case 'device_tracker':
    return 'mdi:account';

  case 'group':
    return 'mdi:google-circles-communities';

  case 'homeassistant':
    return 'mdi:home';

  case 'light':
    return 'mdi:lightbulb';

  case 'media_player':
    let icon = 'mdi:cast';
    if (state && state !== 'off' && state !== 'idle') {
      icon += '-connected';
    }

    return icon;

  case 'notify':
    return 'mdi:comment-alert';

  case 'sun':
    return 'mdi:white-balance-sunny';

  case 'switch':
    return 'mdi:flash';

  case 'simple_alarm':
    return 'mdi:bell';

  case 'scene':
    return 'mdi:google-pages';

  case 'script':
    return 'mdi:file-document';

  case 'sensor':
    return 'mdi:eye';

  case 'thermostat':
    return 'mdi:nest-thermostat';

  default:
    /* eslint-disable no-console */
    console.warn(`Unable to find icon for domain ${domain} (${state})`);
    /* eslint-enable no-console */
    return defaultIcon;
  }
}
