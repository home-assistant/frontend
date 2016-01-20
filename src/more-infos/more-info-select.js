import { serviceActions } from '../util/home-assistant-js-instance';

import Polymer from '../polymer';

require('../components/state-info');

export default new Polymer({
  is: 'more-info-select',

  properties: {
    stateObj: {
      type: Object,
    },
  },
});
