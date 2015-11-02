import Polymer from '../../polymer';

import stateIcon from '../../util/state-icon';

export default new Polymer({
  is: 'ha-state-icon',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  computeIcon(stateObj) {
    return stateIcon(stateObj);
  },
});
