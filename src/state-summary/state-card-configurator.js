import Polymer from '../polymer';

import '../components/state-info';
import './state-card-display';

export default new Polymer({
  is: 'state-card-configurator',

  properties: {
    inDialog: {
      type: Boolean,
      value: false,
    },

    stateObj: {
      type: Object,
    },
  },
});
