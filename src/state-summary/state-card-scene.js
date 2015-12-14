import Polymer from '../polymer';
import hass from '../util/home-assistant-js-instance';

require('../components/state-info.js');

const { serviceActions } = hass;

export default new Polymer({
  is: 'state-card-scene',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  activateScene() {
    serviceActions.callTurnOn(this.stateObj.entityId);
  },
});
