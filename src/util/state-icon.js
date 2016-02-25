import defaultIcon from './default-icon';
import domainIcon from './domain-icon.js';
import hass from './home-assistant-js-instance';

const { util: { temperatureUnits } } = hass;

function binarySensorIcon(state) {
  const activated = state.state && state.state === 'off';
  switch (state.attributes.sensor_class) {
    case 'opening':
      return activated ? 'mdi:crop-square' : 'mdi:exit-to-app';
    case 'moisture':
      return activated ? 'mdi:water-off' : 'mdi:water';
    case 'safety':
    case 'gas':
    case 'light':
      return activated ? 'mdi:brightness-5' : 'mdi:brightness-7'
    case 'sound':
      return activated ? 'mdi:bell-off' : 'mdi:bell-ring'
    case 'vibration':
      return activated ? 'mdi:crop-portrait' : 'mdi:vibrate'
    case 'smoke':
    case 'power':
      return activated ? 'mdi:verified' : 'mdi:alert';
    case 'motion':
      return activated ? 'mdi:walk' : 'mdi:run';
    case 'digital':
    default:
      return activated ? 'mdi:radiobox-blank' : 'mdi:checkbox-marked-circle';
  }
}

export default function stateIcon(state) {
  if (!state) {
    return defaultIcon;
  } else if (state.attributes.icon) {
    return state.attributes.icon;
  }

  const unit = state.attributes.unit_of_measurement;

  if (unit && state.domain === 'sensor') {
    if (unit === temperatureUnits.UNIT_TEMP_C ||
        unit === temperatureUnits.UNIT_TEMP_F) {
      return 'mdi:thermometer';
    } else if (unit === 'Mice') {
      return 'mdi:mouse-variant';
    }
  } else if (state.domain === 'binary_sensor') {
    return binarySensorIcon(state);
  }

  return domainIcon(state.domain, state.state);
}
