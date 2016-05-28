import Polymer from '../polymer';

require('./partial-base');
require('../components/state-history-charts');

export default new Polymer({
  is: 'partial-history',

  behaviors: [window.hassBehavior],

  properties: {
    hass: {
      type: Object,
    },

    narrow: {
      type: Boolean,
    },

    showMenu: {
      type: Boolean,
      value: false,
    },

    isDataLoaded: {
      type: Boolean,
      bindNuclear: hass => hass.entityHistoryGetters.hasDataForCurrentDate,
      observer: 'isDataLoadedChanged',
    },

    stateHistory: {
      type: Object,
      bindNuclear: hass => hass.entityHistoryGetters.entityHistoryForCurrentDate,
    },

    isLoadingData: {
      type: Boolean,
      bindNuclear: hass => hass.entityHistoryGetters.isLoadingEntityHistory,
    },

    selectedDate: {
      type: String,
      value: null,
      bindNuclear: hass => hass.entityHistoryGetters.currentDate,
    },
  },

  isDataLoadedChanged(newVal) {
    if (!newVal) {
      this.async(() => this.hass.entityHistoryActions.fetchSelectedDate(), 1);
    }
  },

  handleRefreshClick() {
    this.hass.entityHistoryActions.fetchSelectedDate();
  },

  datepickerFocus() {
    this.datePicker.adjustPosition();
  },

  attached() {
    this.datePicker = new window.Pikaday({
      field: this.$.datePicker.inputElement,
      onSelect: this.hass.entityHistoryActions.changeCurrentDate,
    });
  },

  detached() {
    this.datePicker.destroy();
  },

  computeContentClasses(narrow) {
    return `flex content ${narrow ? 'narrow' : 'wide'}`;
  },
});
