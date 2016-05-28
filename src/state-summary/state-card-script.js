import Polymer from '../polymer';

require('../components/state-info');
require('../components/entity/ha-entity-toggle');

export default new Polymer({
  is: 'state-card-script',

  properties: {
    inDialog: {
      type: Boolean,
      value: false,
    },

    stateObj: {
      type: Object,
    },
  },

  fireScript(ev) {
    ev.stopPropagation();
    this.hass.serviceActions.callTurnOn(this.stateObj.entityId);
  },
});
