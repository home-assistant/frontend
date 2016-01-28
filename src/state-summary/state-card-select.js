import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';

require('../components/state-info');

const { serviceActions } = hass;

export default new Polymer({
  is: 'state-card-select',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  handleSelect(ev) {
    this.callService('set_option', { option: ev.detail.selected });
  },

  callService(service, data) {
    const serviceData = data || {};
    serviceData.entity_id = this.stateObj.entityId;
    serviceActions.callService('select', service, serviceData);
  },
});
