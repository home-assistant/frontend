import Polymer from '../polymer';

require('../components/state-info');

export default Polymer({
  is: 'state-card-thermostat',

  properties: {
    stateObj: {
      type: Object,
    },
  },
});
