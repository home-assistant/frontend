import {
  configGetters,
  navigationGetters,
  voiceGetters,
  streamGetters,
  serviceGetters,
  syncGetters,
  syncActions,
  voiceActions,
  util
} from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

const { entityDomainFilters } = util;

require('./partial-base');
require('../components/state-cards');
require('../components/ha-voice-command-progress');

export default new Polymer({
  is: 'partial-states',

  behaviors: [nuclearObserver],

  properties: {
    narrow: {
      type: Boolean,
      value: false,
    },

    filter: {
      type: String,
      bindNuclear: navigationGetters.activeFilter,
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

    states: {
      type: Array,
      bindNuclear: [
        navigationGetters.filteredStates,
        // are here so a change to services causes a re-render.
        // we need this to decide if we show toggles for states.
        serviceGetters.entityMap,
        (states) => states.toArray(),
      ],
    },
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

  computeHeaderTitle(filter) {
    return filter ? entityDomainFilters[filter] : 'States';
  },

  computeListenButtonIcon(isListening) {
    return isListening ? 'av:mic-off' : 'av:mic';
  },

  computeRefreshButtonClass(isFetching) {
    if (isFetching) {
      return 'ha-spin';
    }
  },
});
