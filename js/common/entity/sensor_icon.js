/** Return an icon representing a sensor state. */
import { UNIT_C, UNIT_F } from '../const.js';
import domainIcon from './domain_icon.js';

const fixedDeviceClassIcons = {
  humidity: 'mdi:water-percent',
  illuminance: 'mdi:brightness-5',
  temperature: 'mdi:thermometer',
};

export default function sensorIcon(state) {
  const dclass = state.attributes.device_class;

  if (dclass in fixedDeviceClassIcons) {
    return fixedDeviceClassIcons[dclass];
  } else if (dclass === 'battery') {
    if (isNaN(state.state)) {
      return 'mdi:battery-unknown';
    }
    const batteryRound = Math.round(state.state / 10) * 10;
    if (batteryRound >= 100) {
      return 'mdi:battery';
    }
    if (batteryRound <= 0) {
      return 'mdi:battery-alert';
    }
    return `mdi:battery-${batteryRound}`;
  }

  const unit = state.attributes.unit_of_measurement;
  if (unit === UNIT_C || unit === UNIT_F) {
    return 'mdi:thermometer';
  }
  return domainIcon('sensor');
}
