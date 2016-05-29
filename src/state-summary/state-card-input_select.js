import Polymer from '../polymer';

import '../components/state-info';

export default new Polymer({
  is: 'state-card-input_select',

  properties: {
    hass: {
      type: Object,
    },

    inDialog: {
      type: Boolean,
      value: false,
    },

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
    this.hass.serviceActions.callService('input_select', 'select_option', {
      option,
      entity_id: this.stateObj.entityId,
    });
  },

  stopPropagation(ev) {
    ev.stopPropagation();
  },
});
