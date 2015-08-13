import { serviceActions } from '../util/home-assistant-js-instance';

import Polymer from '../polymer';

require('./partial-base');
require('../components/services-list');

export default new Polymer({
  is: 'partial-dev-call-service',

  properties: {
    narrow: {
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

    serviceActions.callService(this.domain, this.service, serviceData);
  },

  computeFormClasses(narrow) {
    return 'layout ' + (narrow ? 'vertical' : 'horizontal');
  },
});
