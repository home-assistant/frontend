import Polymer from '../polymer';

require('../components/state-info');

export default new Polymer({
  is: 'state-card-thermostat',

  properties: {
    stateObj: {
      type: Object,
    },
  },
});
