import Polymer from '../polymer';

require('../components/state-info');

export default new Polymer({
  is: 'state-card-option',

  properties: {
    stateObj: {
      type: Object,
    },
  },
});
