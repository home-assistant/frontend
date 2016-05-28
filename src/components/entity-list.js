import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

export default new Polymer({
  is: 'entity-list',

  behaviors: [nuclearObserver],

  properties: {
    hass: {
      type: Object,
    },

    entities: {
      type: Array,
      bindNuclear: hass => [
        hass.entityGetters.entityMap,
        (map) => map.valueSeq().sortBy((entity) => entity.entityId).toArray(),
      ],
    },
  },

  entitySelected(ev) {
    ev.preventDefault();
    this.fire('entity-selected', { entityId: ev.model.entity.entityId });
  },
});
