import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

const {
  voiceActions,
  voiceGetters,
} = hass;

export default new Polymer({
  is: 'ha-voice-command-dialog',

  behaviors: [nuclearObserver],

  properties: {
    dialogOpen: {
      type: Boolean,
      value: false,
      observer: 'dialogOpenChanged',
    },

    finalTranscript: {
      type: String,
      bindNuclear: voiceGetters.finalTranscript,
    },

    interimTranscript: {
      type: String,
      bindNuclear: voiceGetters.extraInterimTranscript,
    },

    isTransmitting: {
      type: Boolean,
      bindNuclear: voiceGetters.isTransmitting,
    },

    isListening: {
      type: Boolean,
      bindNuclear: voiceGetters.isListening,
    },

    showListenInterface: {
      type: Boolean,
      computed: 'computeShowListenInterface(isListening, isTransmitting)',
      observer: 'showListenInterfaceChanged',
    },
  },

  computeShowListenInterface(isListening, isTransmitting) {
    return isListening || isTransmitting;
  },

  dialogOpenChanged(newVal) {
    if (!newVal && this.isListening) {
      voiceActions.stop();
    }
  },

  showListenInterfaceChanged(newVal) {
    if (!newVal && this.dialogOpen) {
      this.dialogOpen = false;
    } else if (newVal) {
      this.dialogOpen = true;
    }
  },
});
