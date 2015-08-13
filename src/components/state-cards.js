import Polymer from '../polymer';

require('../state-summary/state-card');

export default new Polymer({
  is: 'state-cards',

  properties: {
    states: {
      type: Array,
      value: [],
    },
  },

  computeEmptyStates(states) {
    return states.length === 0;
  },
});
