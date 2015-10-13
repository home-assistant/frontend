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

  activateScene() {
    serviceActions.callTurnOn(this.stateObj.entityId);
  },
});
