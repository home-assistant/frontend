import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('./domain-icon');

const { serviceGetters } = hass;

export default new Polymer({
  is: 'services-list',

  behaviors: [nuclearObserver],

  properties: {
    serviceDomains: {
      type: Array,
      bindNuclear: serviceGetters.entityMap,
    },
  },

  computeDomains(serviceDomains) {
    return serviceDomains.valueSeq().map((domain) => domain.domain).sort().toJS();
  },

  computeServices(serviceDomains, domain) {
    return serviceDomains.get(domain).get('services').keySeq().toArray();
  },

  serviceClicked(ev) {
    ev.preventDefault();
    this.fire(
      'service-selected', { domain: ev.model.domain,
                           service: ev.model.service });
  },
});
