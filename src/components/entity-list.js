import { entityGetters } from 'home-assistant-js';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

export default Polymer({
  is: 'entity-list',

  behaviors: [nuclearObserver],

  properties: {
    entities: {
      type: Array,
      bindNuclear: [
        entityGetters.entityMap,
        function(map) {
          return map.valueSeq().
                  sortBy(function(entity) { return entity.entityId; })
                  .toArray();
        },
      ],
    },
  },

  entitySelected: function(ev) {
    ev.preventDefault();
    this.fire('entity-selected', {entityId: ev.model.entity.entityId});
  },
});
