import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';

require('./partial-base');
require('../components/events-list');

const { eventActions } = hass;

export default new Polymer({
  is: 'partial-dev-fire-event',

  properties: {
    narrow: {
      type: Boolean,
      value: false,
    },

    showMenu: {
      type: Boolean,
      value: false,
    },

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
    let eventData;

    try {
      eventData = this.eventData ? JSON.parse(this.eventData) : {};
    } catch (err) {
      /* eslint-disable no-alert */
      alert(`Error parsing JSON: ${err}`);
      /* eslint-enable no-alert */
      return;
    }

    eventActions.fireEvent(this.eventType, eventData);
  },

  computeFormClasses(narrow) {
    return `content fit ${narrow ? '' : 'layout horizontal'}`;
  },
});
