import { util } from 'home-assistant-js';
import { serviceActions } from 'home-assistant-js';

export default Polymer({
  is: 'more-info-updater',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  updateTapped(stateObj) {
    serviceActions.callService('updater', 'update', {})
  },

  linkTapped(stateObj) {
    window.open(this.stateObj.attributes.link, '_blank');
  },
});
