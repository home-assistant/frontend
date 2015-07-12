import { eventActions } from 'home-assistant-js';

import Polymer from '../polymer';

require('./partial-base');
require('../components/events-list');

export default Polymer({
  is: 'partial-dev-fire-event',

  properties: {
    eventType: {
      type: String,
      value: '',
    },

    eventData: {
      type: String,
      value: '',
    },
  },

  eventSelected(ev) {
    this.eventType = ev.detail.eventType;
  },

  fireEvent() {
    var eventData;

    try {
      eventData = this.eventData ? JSON.parse(this.eventData) : {};
    } catch (err) {
      alert("Error parsing JSON: " + err);
      return;
    }

    eventActions.fireEvent(this.eventType, eventData);
  },

  computeFormClasses(narrow) {
    return 'layout ' + (narrow ? 'vertical' : 'horizontal');
  },
});
