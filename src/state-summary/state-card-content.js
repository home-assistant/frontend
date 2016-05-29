import Polymer from '../polymer';

import stateCardType from '../util/state-card-type';
import dynamicContentUpdater from '../util/dynamic-content-updater';

import './state-card-configurator';
import './state-card-display';
import './state-card-hvac';
import './state-card-input_select';
import './state-card-input_slider';
import './state-card-media_player';
import './state-card-scene';
import './state-card-script';
import './state-card-rollershutter';
import './state-card-thermostat';
import './state-card-toggle';
import './state-card-weblink';

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
