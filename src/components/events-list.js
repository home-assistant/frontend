import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

export default new Polymer({
  is: 'events-list',

  behaviors: [nuclearObserver],

  properties: {
    hass: {
      type: Object,
    },

    events: {
      type: Array,
      bindNuclear: hass => [
        hass.eventGetters.entityMap,
        (map) => map.valueSeq().sortBy((event) => event.event).toArray(),
      ],
    },
  },

  eventSelected(ev) {
    ev.preventDefault();
    this.fire('event-selected', { eventType: ev.model.event.event });
  },
});
