import moment from 'moment';
import Polymer from '../polymer';

const UPDATE_INTERVAL = 60000; // 60 seconds

export default new Polymer({
  is: 'relative-ha-datetime',

  properties: {
    datetime: {
      type: String,
      observer: 'datetimeChanged',
    },

    datetimeObj: {
      type: Object,
      observer: 'datetimeObjChanged',
    },

    parsedDateTime: {
      type: Object,
    },

    relativeTime: {
      type: String,
      value: 'not set',
    },
  },

  created() {
    this.updateRelative = this.updateRelative.bind(this);
  },

  attached() {
    this.updateInterval = setInterval(this.updateRelative, UPDATE_INTERVAL);
  },

  detached() {
    clearInterval(this.updateInterval);
  },

  datetimeChanged(newVal) {
    this.parsedDateTime = newVal ? new Date(newVal) : null;

    this.updateRelative();
  },

  datetimeObjChanged(newVal) {
    this.parsedDateTime = newVal;

    this.updateRelative();
  },

  updateRelative() {
    this.relativeTime = this.parsedDateTime ?
      moment(this.parsedDateTime).fromNow() : '';
  },
});
