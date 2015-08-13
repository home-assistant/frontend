import { serviceActions } from '../util/home-assistant-js-instance';

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
