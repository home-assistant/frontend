import Polymer from '../polymer';
import hass from '../util/home-assistant-js-instance';

require('../components/state-info.js');

const { serviceActions } = hass;

export default new Polymer({
  is: 'state-card-scene',

  properties: {
    detailed: {
      type: Boolean,
      value: false,
    },

    stateObj: {
      type: Object,
    },
  },

  activateScene(ev) {
    ev.stopPropagation();
    serviceActions.callTurnOn(this.stateObj.entityId);
  },
});
