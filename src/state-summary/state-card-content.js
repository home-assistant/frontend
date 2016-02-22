import Polymer from '../polymer';

import stateCardType from '../util/state-card-type';
import dynamicContentUpdater from '../util/dynamic-content-updater';

require('./state-card-configurator');
require('./state-card-display');
require('./state-card-input_select');
require('./state-card-media_player');
require('./state-card-scene');
require('./state-card-rollershutter');
require('./state-card-thermostat');
require('./state-card-toggle');
require('./state-card-weblink');

export default new Polymer({
  is: 'state-card-content',

  properties: {
    stateObj: {
      type: Object,
      observer: 'stateObjChanged',
    },
  },

  stateObjChanged(stateObj) {
    if (!stateObj) return;

    dynamicContentUpdater(
      this, `STATE-CARD-${stateCardType(stateObj).toUpperCase()}`, { stateObj });
  },
});
