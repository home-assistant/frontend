import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

const { entityGetters } = hass;

export default new Polymer({
  is: 'entity-list',

  behaviors: [nuclearObserver],

  properties: {
    entities: {
      type: Array,
      bindNuclear: [
        entityGetters.entityMap,
        (map) => map.valueSeq().sortBy((entity) => entity.entityId).toArray(),
      ],
    },
  },

  entitySelected(ev) {
    ev.preventDefault();
    this.fire('entity-selected', {entityId: ev.model.entity.entityId});
  },
});
