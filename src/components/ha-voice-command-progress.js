import { voiceGetters } from 'home-assistant-js';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

export default Polymer({
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
