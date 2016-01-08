import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('../state-summary/state-card-content');
require('../components/state-history-charts');
require('../more-infos/more-info-content');

const {
  configGetters,
  entityHistoryGetters,
  entityHistoryActions,
  moreInfoGetters,
  moreInfoActions,
} = hass;

// if you don't want the history component to show add the domain to this array
const DOMAINS_WITH_NO_HISTORY = ['camera', 'configurator', 'scene'];

export default new Polymer({
  is: 'more-info-dialog',

  behaviors: [nuclearObserver],

  properties: {
    stateObj: {
      type: Object,
      bindNuclear: moreInfoGetters.currentEntity,
      observer: 'stateObjChanged',
    },

    stateHistory: {
      type: Object,
      bindNuclear: [
        moreInfoGetters.currentEntityHistory,
        (history) => history ? [history] : false,
      ],
    },

    isLoadingHistoryData: {
      type: Boolean,
      computed: 'computeIsLoadingHistoryData(_delayedDialogOpen, _isLoadingHistoryData)',
    },

    _isLoadingHistoryData: {
      type: Boolean,
      bindNuclear: entityHistoryGetters.isLoadingEntityHistory,
    },

    hasHistoryComponent: {
      type: Boolean,
      bindNuclear: configGetters.isComponentLoaded('history'),
      observer: 'fetchHistoryData',
    },

    shouldFetchHistory: {
      type: Boolean,
      bindNuclear: moreInfoGetters.isCurrentEntityHistoryStale,
      observer: 'fetchHistoryData',
    },

    showHistoryComponent: {
      type: Boolean,
      value: false,
    },

    dialogOpen: {
      type: Boolean,
      value: false,
      observer: 'dialogOpenChanged',
    },

    _delayedDialogOpen: {
      type: Boolean,
      value: false,
    },
  },

  /**
   * We depend on a delayed dialogOpen value to tell the chart component
   * that the data is there. Otherwise the chart component will render
   * before the dialog is attached to the screen and is unable to determine
   * graph size resulting in scroll bars.
   */
  computeIsLoadingHistoryData(_delayedDialogOpen, _isLoadingHistoryData) {
    return !_delayedDialogOpen || _isLoadingHistoryData;
  },

  fetchHistoryData() {
    if (this.stateObj && this.hasHistoryComponent &&
        this.shouldFetchHistory) {
      entityHistoryActions.fetchRecent(this.stateObj.entityId);
    }
  },

  stateObjChanged(newVal) {
    if (!newVal) {
      this.dialogOpen = false;
      return;
    }

    this.showHistoryComponent = (
      this.hasHistoryComponent &&
      DOMAINS_WITH_NO_HISTORY.indexOf(this.stateObj.domain) === -1
    );

    this.async(() => {
      // Firing action while other action is happening confuses nuclear
      this.fetchHistoryData();
      // allow dialog to render content before showing it so it is
      // positioned correctly.
      this.dialogOpen = true;
    }, 10);
  },

  dialogOpenChanged(newVal) {
    if (newVal) {
      this.async(() => this._delayedDialogOpen = true, 10);
    } else if (!newVal && this.stateObj) {
      moreInfoActions.deselectEntity();
      this._delayedDialogOpen = false;
    }
  },
});
