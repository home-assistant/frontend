import { serviceActions } from 'home-assistant-js';

import Polymer from '../polymer';

require('../components/state-info');

export default Polymer({
  is: 'state-card-updater',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  buttonTapped: function(ev) {
    ev.stopPropagation();
    window.hass.serviceActions.callService('updater', 'update', {})
  },
});
