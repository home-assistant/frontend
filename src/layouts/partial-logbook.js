import { logbookGetters, logbookActions } from 'home-assistant-js';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('./partial-base');
require('../components/ha-logbook');
require('../components/loading-box');

export default Polymer({
  is: 'partial-logbook',

  behaviors: [nuclearObserver],

  properties: {
    narrow: {
      type: Boolean,
      value: false,
    },

    selectedDate: {
      type: String,
      bindNuclear: logbookGetters.currentDate,
    },

    isLoading: {
      type: Boolean,
      bindNuclear: logbookGetters.isLoadingEntries,
    },

    isStale: {
      type: Boolean,
      bindNuclear: logbookGetters.isCurrentStale,
      observer: 'isStaleChanged',
    },

    entries: {
      type: Array,
      bindNuclear: [
        logbookGetters.currentEntries,
        function(entries) { return entries.toArray(); },
      ],
    },

    datePicker: {
      type: Object,
    },
  },

  isStaleChanged(newVal) {
    if (newVal) {
      // isLoading wouldn't update without async <_<
      this.async(
        function() { logbookActions.fetchDate(this.selectedDate); }, 10);
    }
  },

  handleRefresh() {
    logbookActions.fetchDate(this.selectedDate);
  },

  datepickerFocus() {
    this.datePicker.adjustPosition();
    this.datePicker.gotoDate(moment('2015-06-30').toDate());
  },

  attached() {
    this.datePicker = new Pikaday({
      field: this.$.datePicker.inputElement,
      onSelect: logbookActions.changeCurrentDate,
    });
  },

  detached() {
    this.datePicker.destroy();
  },
});
