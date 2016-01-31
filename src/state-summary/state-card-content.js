import Polymer from '../polymer';

import stateCardType from '../util/state-card-type';

require('./state-card-configurator');
require('./state-card-display');
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

  stateObjChanged(newVal, oldVal) {
    const root = Polymer.dom(this);

    if (!newVal) {
      if (root.lastChild) {
        root.removeChild(root.lastChild);
      }
      return;
    }

    const newCardType = stateCardType(newVal);

    if (!oldVal || stateCardType(oldVal) !== newCardType) {
      if (root.lastChild) {
        root.removeChild(root.lastChild);
      }

      const stateCard = document.createElement(`state-card-${newCardType}`);
      stateCard.stateObj = newVal;
      root.appendChild(stateCard);
    } else {
      root.lastChild.stateObj = newVal;
    }
  },
});
