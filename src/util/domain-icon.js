export default function domainIcon(domain, state) {
  switch (domain) {
  case 'homeassistant':
    return 'home';

  case 'group':
    return 'homeassistant-24:group';

  case 'device_tracker':
    return 'social:person';

  case 'switch':
    return 'image:flash-on';
    
  case 'alarm_control_panel':
    if (state && state === 'disarmed'){
      return 'icons:lock-open';
    }else{
      return 'icons:lock';
    }

  case 'media_player':
    let icon = 'hardware:cast';
    if (state && state !== 'off' && state !== 'idle') {
      icon += '-connected';
    }

    return icon;

  case 'sun':
    return 'image:wb-sunny';

  case 'light':
    return 'image:wb-incandescent';

  case 'simple_alarm':
    return 'social:notifications';

  case 'notify':
    return 'announcement';

  case 'thermostat':
    return 'homeassistant-100:thermostat';

  case 'sensor':
    return 'visibility';

  case 'configurator':
    return 'settings';

  case 'conversation':
    return 'av:hearing';

  case 'script':
    return 'description';

  case 'scene':
    return 'social:pages';

  case 'updater':
    return state === 'update_available' ?
      'icons:cloud-download' : 'icons:cloud-done';

  default:
    return 'bookmark';
  }
}
