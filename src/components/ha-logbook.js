import Polymer from '../polymer';

require('./logbook-entry');

Polymer({
  is: 'ha-logbook',

  properties: {
    entries: {
      type: Object,
      value: [],
    },
  },

  noEntries(entries) {
    return !entries.length;
  }
});
