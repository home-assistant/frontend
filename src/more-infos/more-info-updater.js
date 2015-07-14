import { util } from 'home-assistant-js';

export default Polymer({
  is: 'more-info-updater',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  linkTapped: function(stateObj) {
    window.open(this.stateObj.attributes.link, '_blank');
  },
});
