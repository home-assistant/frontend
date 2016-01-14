import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

const { eventGetters } = hass;

export default new Polymer({
  is: 'events-list',

  behaviors: [nuclearObserver],

  properties: {
    events: {
      type: Array,
      bindNuclear: [
        eventGetters.entityMap,
        (map) => map.valueSeq().sortBy((event) => event.event).toArray(),
      ],
    },
  },

  eventSelected(ev) {
    ev.preventDefault();
    this.fire('event-selected', { eventType: ev.model.event.event });
  },
});
