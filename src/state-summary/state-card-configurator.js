import Polymer from '../polymer';

require('../components/state-info');
require('./state-card-display');

export default new Polymer({
  is: 'state-card-configurator',

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
