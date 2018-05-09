/** Return an icon representing a state. */
import { DEFAULT_DOMAIN_ICON } from '../const.js';

import computeDomain from './compute_domain.js';
import domainIcon from './domain_icon.js';

import binarySensorIcon from './binary_sensor_icon.js';
import coverIcon from './cover_icon.js';
import sensorIcon from './sensor_icon.js';
import inputDateTimeIcon from './input_dateteime_icon.js';

const domainIcons = {
  binary_sensor: binarySensorIcon,
  cover: coverIcon,
  sensor: sensorIcon,
  input_datetime: inputDateTimeIcon,
};

export default function stateIcon(state) {
  if (!state) {
    return DEFAULT_DOMAIN_ICON;
  } else if (state.attributes.icon) {
    return state.attributes.icon;
  }

  const domain = computeDomain(state.entity_id);

  if (domain in domainIcons) {
    return domainIcons[domain](state);
  }
  return domainIcon(domain, state.state);
}
