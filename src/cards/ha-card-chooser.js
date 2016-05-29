import Polymer from '../polymer';

import dynamicContentUpdater from '../util/dynamic-content-updater';

import './ha-camera-card';
import './ha-entities-card';
import './ha-media_player-card';

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
