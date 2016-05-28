import Polymer from '../polymer';

import stateCardType from '../util/state-card-type';
import dynamicContentUpdater from '../util/dynamic-content-updater';

require('./state-card-configurator');
require('./state-card-display');
require('./state-card-hvac');
require('./state-card-input_select');
require('./state-card-input_slider');
require('./state-card-media_player');
require('./state-card-scene');
require('./state-card-script');
require('./state-card-rollershutter');
require('./state-card-thermostat');
require('./state-card-toggle');
require('./state-card-weblink');

export default new Polymer({
  is: 'state-card-content',

  properties: {
    hass: {
      type: Object,
    },

    inDialog: {
      type: Boolean,
      value: false,
    },

    stateObj: {
      type: Object,
    },
  },

  observers: [
    'inputChanged(hass, inDialog, stateObj)',
  ],

  inputChanged(hass, inDialog, stateObj) {
    if (!stateObj) return;

    dynamicContentUpdater(
      this, `STATE-CARD-${stateCardType(this.hass, stateObj).toUpperCase()}`,
      { hass, stateObj, inDialog });
  },
});
