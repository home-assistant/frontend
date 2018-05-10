/** Return an icon representing a cover state. */
import domainIcon from './domain_icon.js';

export default function coverIcon(state) {
  var open = state.state && state.state !== 'closed';
  switch (state.attributes.device_class) {
    case 'garage':
      return open ? 'mdi:garage-open' : 'mdi:garage';
    default:
      return domainIcon('cover', state.state);
  }
}
