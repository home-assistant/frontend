import Polymer from '../polymer';

require('./entity/state-badge');

export default new Polymer({
  is: 'state-info',

  properties: {
    detailed: {
      type: Boolean,
      value: false,
    },

    stateObj: {
      type: Object,
    },
  },
});
