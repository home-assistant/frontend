import { util } from 'home-assistant-js';
import { serviceActions } from 'home-assistant-js';

export default Polymer({
  is: 'more-info-updater',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  updateTapped: function(stateObj) {
    serviceActions.callService('updater', 'update', {})
  },

  linkTapped: function(stateObj) {
    window.open(this.stateObj.attributes.link, '_blank');
  },
});
