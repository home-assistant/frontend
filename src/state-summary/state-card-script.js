import Polymer from '../polymer';
import hass from '../util/home-assistant-js-instance';

require('../components/state-info');
require('../components/entity/ha-entity-toggle');

const { serviceActions } = hass;

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
    serviceActions.callTurnOn(this.stateObj.entityId);
  },
});
