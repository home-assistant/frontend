import Polymer from '../polymer';
import hass from '../util/home-assistant-js-instance';

require('../components/state-info');
require('../components/entity/ha-entity-toggle');

const { serviceActions } = hass;

export default new Polymer({
  is: 'state-card-script',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  fireScript() {
    serviceActions.callTurnOn(this.stateObj.entityId);
  },
});
