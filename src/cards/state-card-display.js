import Polymer from '../polymer';

require('../components/state-info');

export default Polymer({
  is: 'state-card-display',

  properties: {
    stateObj: {
      type: Object,
    },
  },
});