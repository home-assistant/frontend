/** Return an icon representing an input datetime state. */
import domainIcon from './domain_icon.js';

export default function inputDateTimeIcon(state) {
  if (!state.attributes.has_date) {
    return 'hass:clock';
  } else if (!state.attributes.has_time) {
    return 'hass:calendar';
  }
  return domainIcon('input_datetime');
}
