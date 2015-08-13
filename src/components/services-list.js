import { serviceGetters } from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('./domain-icon');

export default new Polymer({
  is: 'services-list',

  behaviors: [nuclearObserver],

  properties: {
    serviceDomains: {
      type: Array,
      bindNuclear: [
        serviceGetters.entityMap,
        (map) => map.valueSeq().sortBy((domain) => domain.domain).toJS(),
      ],
    },
  },

  computeServices(domain) {
    return this.services.get(domain).toArray();
  },

  serviceClicked(ev) {
    ev.preventDefault();
    this.fire(
      'service-selected', {domain: ev.model.domain.domain,
                           service: ev.model.service});
  },
});
