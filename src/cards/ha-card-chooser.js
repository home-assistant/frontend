import Polymer from '../polymer';

import dynamicContentUpdater from '../util/dynamic-content-updater';

require('./ha-camera-card');
require('./ha-entities-card');
require('./ha-introduction-card');
require('./ha-media_player-card');

export default new Polymer({
  is: 'ha-card-chooser',

  properties: {
    cardData: {
      type: Object,
      observer: 'cardDataChanged',
    },
  },

  cardDataChanged(newData) {
    if (!newData) return;

    dynamicContentUpdater(this, `HA-${newData.cardType.toUpperCase()}-CARD`,
                          newData);
  },
});
