import Polymer from '../polymer';

import '../components/state-info.js';

export default new Polymer({
  is: 'state-card-scene',

  properties: {
    hass: {
      type: Object,
    },

    inDialog: {
      type: Boolean,
      value: false,
    },

    stateObj: {
      type: Object,
    },
  },

  activateScene(ev) {
    ev.stopPropagation();
    this.hass.serviceActions.callTurnOn(this.stateObj.entityId);
  },
});
