import {
  streamGetters,
  syncActions,
  serviceActions
} from 'home-assistant-js';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

require('../components/loading-box');

export default Polymer({
  is: 'more-info-configurator',

  behaviors: [nuclearObserver],

  properties: {
    stateObj: {
      type: Object,
    },

    action: {
      type: String,
      value: 'display',
    },

    isStreaming: {
      type: Boolean,
      bindNuclear: streamGetters.isStreamingEvents,
    },

    isConfigurable: {
      type: Boolean,
      computed: 'computeIsConfigurable(stateObj)',
    },

    isConfiguring: {
      type: Boolean,
      value: false,
    },

    submitCaption: {
      type: String,
      computed: 'computeSubmitCaption(stateObj)',
    },
  },

  computeIsConfigurable(stateObj) {
    return stateObj.state == 'configure';
  },

  computeSubmitCaption(stateObj) {
    return stateObj.attributes.submit_caption || 'Set configuration';
  },

  submitClicked() {
    this.isConfiguring = true;

    var data = {
      configure_id: this.stateObj.attributes.configure_id
    };

    serviceActions.callService('configurator', 'configure', data).then(
      function() {
        this.isConfiguring = false;

        if (!this.isStreaming) {
          syncActions.fetchAll();
        }
      }.bind(this),

      function() {
        this.isConfiguring = false;
      }.bind(this));
  },
});
