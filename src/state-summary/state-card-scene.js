import Polymer from '../polymer';
import { serviceActions } from '../util/home-assistant-js-instance';

require('../components/state-info.js');

export default new Polymer({
  is: 'state-card-scene',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  activateScene(ev) {
    // ev.preventDefault();
    // ev.stopPropagation();
    serviceActions.callTurnOn(this.stateObj.entityId);
  },
});
