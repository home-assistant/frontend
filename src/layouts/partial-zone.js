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
require('../components/ha-voice-command-progress');
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

    isListening: {
      type: Boolean,
      bindNuclear: voiceGetters.isListening,
    },

    showListenInterface: {
      type: Boolean,
      bindNuclear: [
        voiceGetters.isListening,
        voiceGetters.isTransmitting,
        (isListening, isTransmitting) => isListening || isTransmitting,
      ],
    },

    introductionLoaded: {
      type: Boolean,
      bindNuclear: configGetters.isComponentLoaded('introduction'),
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
  },

  attached() {
    const sizes = [];
    for (let i = 0; i < 4; i++) {
      sizes.push(940 + i * 350);
    }
    this.mqls = sizes.map(width => {
      const mql = window.matchMedia(`(min-width: ${width}px)`);
      mql.addListener(this.windowChange);
      return mql;
    });
    this.windowChange();
  },

  detached() {
    this.mqls.forEach(mql => mql.removeListener(this.windowChange));
  },

  windowChange() {
    this.columns = this.mqls.reduce((cols, mql) => cols + mql.matches, 1);
  },

  handleRefresh() {
    syncActions.fetchAll();
  },

  handleListenClick() {
    if (this.isListening) {
      voiceActions.stop();
    } else {
      voiceActions.listen();
    }
  },

  computeDomains(states) {
    return states.keySeq().toArray();
  },

  computeStatesOfDomain(states, domain) {
    return states.get(domain).toArray();
  },

  computeListenButtonIcon(isListening) {
    return isListening ? 'av:mic-off' : 'av:mic';
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
