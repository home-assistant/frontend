import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('./partial-base');
require('../components/ha-logbook');
require('../components/loading-box');

const { logbookGetters, logbookActions } = hass;

export default new Polymer({
  is: 'partial-logbook',

  behaviors: [nuclearObserver],

  properties: {
    narrow: {
      type: Boolean,
      value: false,
    },

    showMenu: {
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
        (entries) => entries.reverse().toArray(),
      ],
    },

    datePicker: {
      type: Object,
    },
  },

  isStaleChanged(newVal) {
    if (newVal) {
      this.async(() => logbookActions.fetchDate(this.selectedDate), 1);
    }
  },

  handleRefresh() {
    logbookActions.fetchDate(this.selectedDate);
  },

  datepickerFocus() {
    this.datePicker.adjustPosition();
  },

  attached() {
    this.datePicker = new window.Pikaday({
      field: this.$.datePicker.inputElement,
      onSelect: logbookActions.changeCurrentDate,
    });
  },

  detached() {
    this.datePicker.destroy();
  },
});
