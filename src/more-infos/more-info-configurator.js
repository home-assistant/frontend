import Polymer from '../polymer';

require('../components/loading-box');

export default new Polymer({
  is: 'more-info-configurator',

  behaviors: [window.hassBehavior],

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
      bindNuclear: hass => hass.streamGetters.isStreamingEvents,
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

    fieldInput: {
      type: Object, value: {},
    },
  },

  computeIsConfigurable(stateObj) {
    return stateObj.state === 'configure';
  },

  computeSubmitCaption(stateObj) {
    return stateObj.attributes.submit_caption || 'Set configuration';
  },

  fieldChanged(ev) {
    const el = ev.target;
    this.fieldInput[el.id] = el.value;
  },

  submitClicked() {
    this.isConfiguring = true;

    const data = {
      configure_id: this.stateObj.attributes.configure_id,
      fields: this.fieldInput,
    };

    this.hass.serviceActions.callService('configurator', 'configure', data).then(
      () => {
        this.isConfiguring = false;

        if (!this.isStreaming) {
          this.hass.syncActions.fetchAll();
        }
      },
      () => {
        this.isConfiguring = false;
      }
    );
  },
});
