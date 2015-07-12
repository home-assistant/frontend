import Polymer from '../polymer';

require('../cards/state-card');

Polymer({
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
