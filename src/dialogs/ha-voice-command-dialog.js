import Polymer from '../polymer';

export default new Polymer({
  is: 'ha-voice-command-dialog',

  behaviors: [window.hassBehavior],

  properties: {
    hass: {
      type: Object,
    },

    dialogOpen: {
      type: Boolean,
      value: false,
      observer: 'dialogOpenChanged',
    },

    finalTranscript: {
      type: String,
      bindNuclear: hass => hass.voiceGetters.finalTranscript,
    },

    interimTranscript: {
      type: String,
      bindNuclear: hass => hass.voiceGetters.extraInterimTranscript,
    },

    isTransmitting: {
      type: Boolean,
      bindNuclear: hass => hass.voiceGetters.isTransmitting,
    },

    isListening: {
      type: Boolean,
      bindNuclear: hass => hass.voiceGetters.isListening,
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
      this.hass.voiceActions.stop();
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
