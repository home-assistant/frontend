import Polymer from '../polymer';

require('../components/state-info');

export default new Polymer({
  is: 'state-card-hvac',

  properties: {
    inDialog: {
      type: Boolean,
      value: false,
    },

    stateObj: {
      type: Object,
    },
  },
});
