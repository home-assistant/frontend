import Polymer from '../polymer';

import './domain-icon';

export default new Polymer({
  is: 'services-list',

  behaviors: [window.hassBehavior],

  properties: {
    hass: {
      type: Object,
    },

    serviceDomains: {
      type: Array,
      bindNuclear: hass => hass.serviceGetters.entityMap,
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
