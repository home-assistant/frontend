import Polymer from '../polymer';

import '../state-summary/state-card-content';
import '../components/state-history-charts';
import '../more-infos/more-info-content';

const DOMAINS_WITH_NO_HISTORY = ['camera', 'configurator', 'scene'];

export default new Polymer({
  is: 'more-info-dialog',

  behaviors: [window.hassBehavior],

  properties: {
    stateObj: {
      type: Object,
      bindNuclear: hass => hass.moreInfoGetters.currentEntity,
      observer: 'stateObjChanged',
    },

    stateHistory: {
      type: Object,
      bindNuclear: hass => [
        hass.moreInfoGetters.currentEntityHistory,
        (history) => (history ? [history] : false),
      ],
    },

    isLoadingHistoryData: {
      type: Boolean,
      computed: 'computeIsLoadingHistoryData(delayedDialogOpen, isLoadingEntityHistoryData)',
    },

    isLoadingEntityHistoryData: {
      type: Boolean,
      bindNuclear: hass => hass.entityHistoryGetters.isLoadingEntityHistory,
    },

    hasHistoryComponent: {
      type: Boolean,
      bindNuclear: hass => hass.configGetters.isComponentLoaded('history'),
      observer: 'fetchHistoryData',
    },

    shouldFetchHistory: {
      type: Boolean,
      bindNuclear: hass => hass.moreInfoGetters.isCurrentEntityHistoryStale,
      observer: 'fetchHistoryData',
    },

    showHistoryComponent: {
      type: Boolean,
      value: false,
      computed: 'computeShowHistoryComponent(hasHistoryComponent, stateObj)',
    },

    dialogOpen: {
      type: Boolean,
      value: false,
      observer: 'dialogOpenChanged',
    },

    delayedDialogOpen: {
      type: Boolean,
      value: false,
    },
  },

  ready() {
    this.$.scrollable.dialogElement = this.$.dialog;
  },

  /**
   * We depend on a delayed dialogOpen value to tell the chart component
   * that the data is there. Otherwise the chart component will render
   * before the dialog is attached to the screen and is unable to determine
   * graph size resulting in scroll bars.
   */
  computeIsLoadingHistoryData(delayedDialogOpen, isLoadingEntityHistoryData) {
    return !delayedDialogOpen || isLoadingEntityHistoryData;
  },

  computeShowHistoryComponent(hasHistoryComponent, stateObj) {
    return this.hasHistoryComponent && stateObj &&
      DOMAINS_WITH_NO_HISTORY.indexOf(stateObj.domain) === -1;
  },

  fetchHistoryData() {
    if (this.stateObj && this.hasHistoryComponent &&
        this.shouldFetchHistory) {
      this.hass.entityHistoryActions.fetchRecent(this.stateObj.entityId);
    }
  },

  stateObjChanged(newVal) {
    if (!newVal) {
      this.dialogOpen = false;
      return;
    }

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
      this.async(() => { this.delayedDialogOpen = true; }, 10);
    } else if (!newVal && this.stateObj) {
      this.async(() => this.hass.moreInfoActions.deselectEntity(), 10);
      this.delayedDialogOpen = false;
    }
  },
});
