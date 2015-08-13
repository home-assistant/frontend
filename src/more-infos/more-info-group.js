import {
  entityGetters,
  moreInfoGetters
} from 'home-assistant-js';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('../cards/state-card-content');

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


  updateStates() {
    this.states = this.stateObj && this.stateObj.attributes.entity_id ?
      stateStore.gets(this.stateObj.attributes.entity_id).toArray() : [];
  },
});
