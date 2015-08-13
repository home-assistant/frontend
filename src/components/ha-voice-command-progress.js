import { voiceGetters } from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

export default new Polymer({
  is: 'ha-voice-command-progress',

  behaviors: [nuclearObserver],

  properties: {
    isTransmitting: {
      type: Boolean,
      bindNuclear: voiceGetters.isTransmitting,
    },

    interimTranscript: {
      type: String,
      bindNuclear: voiceGetters.extraInterimTranscript,
    },

    finalTranscript: {
      type: String,
      bindNuclear: voiceGetters.finalTranscript,
    },
  },
});
