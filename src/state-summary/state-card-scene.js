import Polymer from '../polymer';

require('./state-card-display');
require('./state-card-toggle');

export default new Polymer({
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

  computeAllowToggle(stateObj) {
    return stateObj.state === 'off' || stateObj.attributes.active_requested;
  },
});
