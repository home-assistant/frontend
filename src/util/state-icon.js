import defaultIcon from './default-icon';
import domainIcon from './domain-icon.js';
import hass from './home-assistant-js-instance';

const { util: { temperatureUnits } } = hass;

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
    } else if (unit === 'Mouse' ||
               unit === 'Mice') {
      return 'mdi:mouse-variant';
    }
  }

  return domainIcon(state.domain, state.state);
}
