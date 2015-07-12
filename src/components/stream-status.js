import { streamGetters, streamActions } from 'home-assistant-js';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

export default Polymer({
  is: 'stream-status',

  behaviors: [nuclearObserver],

  properties: {
    isStreaming: {
      type: Boolean,
      bindNuclear: streamGetters.isStreamingEvents,
    },

    hasError: {
      type: Boolean,
      bindNuclear: streamGetters.hasStreamingEventsError,
    },
  },

  toggleChanged: function() {
    if (this.isStreaming) {
      streamActions.stop();
    } else {
      streamActions.start();
    }
  },
});
