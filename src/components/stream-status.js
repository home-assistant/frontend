import { streamGetters, streamActions } from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

export default new Polymer({
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

  toggleChanged() {
    if (this.isStreaming) {
      streamActions.stop();
    } else {
      streamActions.start();
    }
  },
});
