import Polymer from '../polymer';

import './partial-base';
import '../components/services-list';

export default new Polymer({
  is: 'partial-dev-call-service',

  properties: {
    hass: {
      type: Object,
    },

    narrow: {
      type: Boolean,
      value: false,
    },

    showMenu: {
      type: Boolean,
      value: false,
    },

    domain: {
      type: String,
      value: '',
    },

    service: {
      type: String,
      value: '',
    },

    serviceData: {
      type: String,
      value: '',
    },

    description: {
      type: String,
      computed: 'computeDescription(hass, domain, service)',
    },
  },

  computeDescription(hass, domain, service) {
    return hass.reactor.evaluate([
      hass.serviceGetters.entityMap,
      map => (map.has(domain) && map.get(domain).get('services').has(service) ?
              JSON.stringify(map.get(domain).get('services').get(service).toJS(), null, 2) :
              'No description available'),
    ]);
  },

  serviceSelected(ev) {
    this.domain = ev.detail.domain;
    this.service = ev.detail.service;
  },

  callService() {
    let serviceData;
    try {
      serviceData = this.serviceData ? JSON.parse(this.serviceData) : {};
    } catch (err) {
      /* eslint-disable no-alert */
      alert(`Error parsing JSON: ${err}`);
      /* eslint-enable no-alert */
      return;
    }

    this.hass.serviceActions.callService(this.domain, this.service, serviceData);
  },

  computeFormClasses(narrow) {
    return `content fit ${narrow ? '' : 'layout horizontal'}`;
  },
});
