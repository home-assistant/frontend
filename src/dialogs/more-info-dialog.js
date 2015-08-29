import {
  configGetters,
  entityHistoryGetters,
  entityHistoryActions,
  moreInfoGetters,
  moreInfoActions
} from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('../state-summary/state-card-content');
require('../components/state-history-charts');
require('../more-infos/more-info-content');

// if you don't want the history component to show add the domain to this array
const DOMAINS_WITH_NO_HISTORY = ['camera', 'configurator'];

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

    _boundOnBackdropTap: {
      type: Function,
      value: function bindBackdropTap() {
        return this._onBackdropTap.bind(this);
      },
    },
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
      DOMAINS_WITH_NO_HISTORY.indexOf(this.stateObj.domain) === -1 &&
      this.hasHistoryComponent
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
      this.$.dialog.backdropElement.addEventListener('click',
                                                     this._boundOnBackdropTap);
    } else if (!newVal && this.stateObj) {
      moreInfoActions.deselectEntity();
    }
  },

  _onBackdropTap() {
    this.$.dialog.backdropElement.removeEventListener('click',
                                                      this._boundOnBackdropTap);
    this.dialogOpen = false;
  },
});
