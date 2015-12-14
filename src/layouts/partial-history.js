import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('./partial-base');
require('../components/state-history-charts');

const {
  entityHistoryGetters,
  entityHistoryActions,
} = hass;

export default new Polymer({
  is: 'partial-history',

  behaviors: [nuclearObserver],

  properties: {
    narrow: {
      type: Boolean,
    },

    showMenu: {
      type: Boolean,
      value: false,
    },

    isDataLoaded: {
      type: Boolean,
      bindNuclear: entityHistoryGetters.hasDataForCurrentDate,
      observer: 'isDataLoadedChanged',
    },

    stateHistory: {
      type: Object,
      bindNuclear: entityHistoryGetters.entityHistoryForCurrentDate,
    },

    isLoadingData: {
      type: Boolean,
      bindNuclear: entityHistoryGetters.isLoadingEntityHistory,
    },

    selectedDate: {
      type: String,
      value: null,
      bindNuclear: entityHistoryGetters.currentDate,
    },
  },

  isDataLoadedChanged(newVal) {
    if (!newVal) {
      this.async(() => entityHistoryActions.fetchSelectedDate(), 1);
    }
  },

  handleRefreshClick() {
    entityHistoryActions.fetchSelectedDate();
  },

  datepickerFocus() {
    this.datePicker.adjustPosition();
  },

  attached() {
    this.datePicker = new window.Pikaday({
      field: this.$.datePicker.inputElement,
      onSelect: entityHistoryActions.changeCurrentDate,
    });
  },

  detached() {
    this.datePicker.destroy();
  },

  computeContentClasses(narrow) {
    return 'flex content ' + (narrow ? 'narrow' : 'wide');
  },
});
