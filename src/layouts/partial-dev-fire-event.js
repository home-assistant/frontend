import Polymer from '../polymer';

require('./partial-base');

export default new Polymer({
  is: 'partial-dev-fire-event',

  properties: {
    hass: {
      type: Object,
    },

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

    this.hass.eventActions.fireEvent(this.eventType, eventData);
  },

  computeFormClasses(narrow) {
    return `content fit ${narrow ? '' : 'layout horizontal'}`;
  },
});
