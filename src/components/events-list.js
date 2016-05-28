import Polymer from '../polymer';

export default new Polymer({
  is: 'events-list',

  behaviors: [window.hassBehavior],

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
