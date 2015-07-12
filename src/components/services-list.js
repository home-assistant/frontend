import { serviceGetters } from 'home-assistant-js';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('./domain-icon');

export default Polymer({
  is: 'services-list',

  behaviors: [nuclearObserver],

  properties: {
    serviceDomains: {
      type: Array,
      bindNuclear: [
        serviceGetters.entityMap,
        function(map) {
          return map.valueSeq()
                  .sortBy(function(domain) { return domain.domain; })
                  .toJS();
          },
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
