import Polymer from '../polymer';

import './partial-base';
import '../components/logbook-entry';

export default new Polymer({
  is: 'partial-logbook',

  behaviors: [window.hassBehavior],

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

    selectedDate: {
      type: String,
      bindNuclear: hass => hass.logbookGetters.currentDate,
    },

    isLoading: {
      type: Boolean,
      bindNuclear: hass => hass.logbookGetters.isLoadingEntries,
    },

    isStale: {
      type: Boolean,
      bindNuclear: hass => hass.logbookGetters.isCurrentStale,
      observer: 'isStaleChanged',
    },

    entries: {
      type: Array,
      bindNuclear: hass => [
        hass.logbookGetters.currentEntries,
        (entries) => entries.reverse().toArray(),
      ],
    },

    datePicker: {
      type: Object,
    },
  },

  isStaleChanged(newVal) {
    if (newVal) {
      this.async(() => this.hass.logbookActions.fetchDate(this.selectedDate), 1);
    }
  },

  handleRefresh() {
    this.hass.logbookActions.fetchDate(this.selectedDate);
  },

  datepickerFocus() {
    this.datePicker.adjustPosition();
  },

  attached() {
    this.datePicker = new window.Pikaday({
      field: this.$.datePicker.inputElement,
      onSelect: this.hass.logbookActions.changeCurrentDate,
    });
  },

  detached() {
    this.datePicker.destroy();
  },
});
