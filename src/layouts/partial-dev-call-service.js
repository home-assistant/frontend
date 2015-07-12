import { serviceActions } from 'home-assistant-js';

import Polymer from '../polymer';

require('./partial-base');
require('../components/services-list');

export default Polymer({
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
    var serviceData;

    try {
      serviceData = this.serviceData ? JSON.parse(this.serviceData): {};
    } catch (err) {
      alert("Error parsing JSON: " + err);
      return;
    }

    serviceActions.callService(this.domain, this.service, serviceData);
  },

  computeFormClasses(narrow) {
    return 'layout ' + (narrow ? 'vertical' : 'horizontal');
  },
});
