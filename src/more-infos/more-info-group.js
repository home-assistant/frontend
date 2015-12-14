import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('../state-summary/state-card-content');

const {
  entityGetters,
  moreInfoGetters,
} = hass;

export default new Polymer({
  is: 'more-info-group',

  behaviors: [nuclearObserver],

  properties: {
    stateObj: {
      type: Object,
    },

    states: {
      type: Array,
      bindNuclear: [
        moreInfoGetters.currentEntity,
        entityGetters.entityMap,
        (currentEntity, entities) => {
          // weird bug??
          if (!currentEntity) {
            return [];
          }
          return currentEntity.attributes.entity_id.map(
            entities.get.bind(entities));
        },
      ],
    },
  },
});
