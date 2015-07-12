import Polymer from '../polymer';

Polymer({
  is: 'ha-logbook',

  properties: {
    entries: {
      type: Object,
      value: [],
    },
  },

  noEntries: function(entries) {
    return !entries.length;
  }
});
