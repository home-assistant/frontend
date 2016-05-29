import Polymer from '../polymer';

import '../components/entity/ha-state-label-badge';

export default new Polymer({
  is: 'ha-badges-card',

  properties: {
    hass: {
      type: Object,
    },

    states: {
      type: Array,
    },
  },
});
