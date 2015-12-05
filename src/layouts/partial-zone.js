import {
  configGetters,
  entityGetters,
  voiceGetters,
  streamGetters,
  syncGetters,
  syncActions,
  voiceActions,
} from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('./partial-base');
require('../components/ha-zone-cards');

export default new Polymer({
  is: 'partial-zone',

  behaviors: [nuclearObserver],

  properties: {
    narrow: {
      type: Boolean,
      value: false,
    },

    isFetching: {
      type: Boolean,
      bindNuclear: syncGetters.isFetching,
    },

    isStreaming: {
      type: Boolean,
      bindNuclear: streamGetters.isStreamingEvents,
    },

    canListen: {
      type: Boolean,
      bindNuclear: [
        voiceGetters.isVoiceSupported,
        configGetters.isComponentLoaded('conversation'),
        (isVoiceSupported, componentLoaded) => isVoiceSupported && componentLoaded,
      ],
    },

    introductionLoaded: {
      type: Boolean,
      bindNuclear: configGetters.isComponentLoaded('introduction'),
    },

    locationName: {
      type: String,
      bindNuclear: configGetters.locationName,
    },

    showMenu: {
      type: Boolean,
      value: false,
      observer: 'windowChange',
    },

    states: {
      type: Object,
      bindNuclear: entityGetters.visibleEntityMap,
    },

    columns: {
      type: Number,
    },
  },

  created() {
    this.windowChange = this.windowChange.bind(this);
    const sizes = [];
    for (let col = 0; col < 5; col++) {
      sizes.push(300 + col * 300);
    }
    this.mqls = sizes.map(width => {
      const mql = window.matchMedia(`(min-width: ${width}px)`);
      mql.addListener(this.windowChange);
      return mql;
    });
  },

  detached() {
    this.mqls.forEach(mql => mql.removeListener(this.windowChange));
  },

  windowChange() {
    const matchColumns = this.mqls.reduce((cols, mql) => cols + mql.matches, 0);
    this.columns = Math.max(1, matchColumns - this.showMenu);
  },

  handleRefresh() {
    syncActions.fetchAll();
  },

  handleListenClick() {
    voiceActions.listen();
  },

  computeDomains(states) {
    return states.keySeq().toArray();
  },

  computeMenuButtonClass(narrow, showMenu) {
    return !narrow && showMenu ? 'invisible' : '';
  },

  computeStatesOfDomain(states, domain) {
    return states.get(domain).toArray();
  },

  computeRefreshButtonClass(isFetching) {
    if (isFetching) {
      return 'ha-spin';
    }
  },

  computeShowIntroduction(introductionLoaded, states) {
    return introductionLoaded || states.size === 0;
  },

  toggleMenu() {
    this.fire('open-menu');
  },
});
