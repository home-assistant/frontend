import Polymer from '../polymer';

require('./state-card-display');
require('./state-card-toggle');

export default Polymer({
  is: 'state-card-scene',

  properties: {
    stateObj: {
      type: Object,
    },

    allowToggle: {
      type: Boolean,
      value: false,
      computed: 'computeAllowToggle(stateObj)',
    },
  },

  computeAllowToggle: function(stateObj) {
    return stateObj.state === 'off' || stateObj.attributes.active_requested;
  },
});
