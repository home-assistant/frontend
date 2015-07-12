import {
  configGetters,
  entityHistoryGetters,
  entityHistoryActions,
  moreInfoGetters,
  moreInfoActions
} from 'home-assistant-js';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('../cards/state-card-content');
require('../components/state-history-charts');
require('../more-infos/more-info-content');

// if you don't want the history component to show add the domain to this array
const DOMAINS_WITH_NO_HISTORY = ['camera'];

export default Polymer({
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
        function(history) {
          return history ? [history] : false;
        },
      ],
    },

    isLoadingHistoryData: {
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
  },

  fetchHistoryData() {
    if (this.stateObj && this.hasHistoryComponent &&
        this.shouldFetchHistory) {
      entityHistoryActions.fetchRecent(this.stateObj.entityId);
    }
    if(this.stateObj) {
      if(DOMAINS_WITH_NO_HISTORY.indexOf(this.stateObj.domain) !== -1) {
        this.showHistoryComponent = false;
      }
      else {
        this.showHistoryComponent = this.hasHistoryComponent;
      }
    }
  },

  stateObjChanged(newVal) {
    if (!newVal) {
      this.dialogOpen = false;
      return;
    }

    this.fetchHistoryData();

    // allow dialog to render content before showing it so it is
    // positioned correctly.
    this.async(function() {
      this.dialogOpen = true;
    }.bind(this), 10);
  },

  dialogOpenChanged(newVal) {
    if (!newVal) {
      moreInfoActions.deselectEntity();
    }
  },
});
