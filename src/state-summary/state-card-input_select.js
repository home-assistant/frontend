import hass from '../util/home-assistant-js-instance';
import Polymer from '../polymer';

require('../components/state-info');

const { serviceActions } = hass;

export default new Polymer({
  is: 'state-card-input_select',

  properties: {
    stateObj: {
      type: Object,
    },

    selectedOption: {
      type: String,
      observer: 'selectedOptionChanged',
    },
  },

  computeSelected(stateObj) {
    return stateObj.attributes.options.indexOf(stateObj.state);
  },

  selectedOptionChanged(option) {
    // Selected Option will transition to '' before transitioning to new value
    if (option === '' || option === this.stateObj.state) {
      return;
    }
    serviceActions.callService('input_select', 'select_option', {
      option,
      entity_id: this.stateObj.entityId,
    });
  },

  stopPropagation(ev) {
    ev.stopPropagation();
  },
});
