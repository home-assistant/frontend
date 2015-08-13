import { serviceActions } from 'home-assistant-js';

export default new Polymer({
  is: 'more-info-updater',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  updateTapped() {
    serviceActions.callService('updater', 'update', {});
  },

  linkTapped() {
    window.open(this.stateObj.attributes.link, '_blank');
  },
});
