import Polymer from '../polymer';

require('../components/entity/ha-state-label-badge');

export default new Polymer({
  is: 'ha-badges-card',

  properties: {
    states: {
      type: Array,
    },
  },
});
