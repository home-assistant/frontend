import { serviceActions } from '../util/home-assistant-js-instance';

import Polymer from '../polymer';

require('../components/state-info');

export default new Polymer({
  is: 'more-info-option',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  handleSelect(ev) {
    this.callService('set_option', { option: ev.target.value });
  },

  callService(service, data) {
    const serviceData = data || {};
    serviceData.entity_id = this.stateObj.entityId;
    serviceActions.callService('option', service, serviceData);
  },

  computeIsActive(option, stateObj) {
    return option == stateObj.state;
  },
});
