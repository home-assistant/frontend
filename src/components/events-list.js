import { eventGetters } from 'home-assistant-js';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

export default Polymer({
  is: 'events-list',

  behaviors: [nuclearObserver],

  properties: {
    events: {
      type: Array,
      bindNuclear: [
        eventGetters.entityMap,
        (map) => map.valueSeq().sortBy((event) => event.event).toArray()
      ],
    },
  },

  eventSelected(ev) {
    ev.preventDefault();
    this.fire('event-selected', {eventType: ev.model.event.event});
  },
});
