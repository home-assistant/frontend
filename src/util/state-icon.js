import defaultIcon from './default-icon';
import domainIcon from './domain-icon.js';
import {
  util,
} from './home-assistant-js-instance';


export default function stateIcon(state) {
  if (!state) {
    return defaultIcon;
  } else if (state.attributes.icon) {
    return state.attributes.icon;
  }

  const unit = state.attributes.unit_of_measurement;

  if (unit && state.domain === 'sensor') {
    if (unit === util.temperatureUnits.UNIT_TEMP_C ||
        unit === util.temperatureUnits.UNIT_TEMP_F) {
      return 'homeassistant-100:thermostat';
    }
  }

  return domainIcon(state.domain, state.state);
}
