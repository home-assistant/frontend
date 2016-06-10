import Polymer from '../polymer';

import stateCardType from '../util/state-card-type';
import dynamicContentUpdater from '../util/dynamic-content-updater';

import '../components/state-info';

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
