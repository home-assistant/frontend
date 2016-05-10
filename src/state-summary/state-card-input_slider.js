import hass from '../util/home-assistant-js-instance';
import Polymer from '../polymer';

require('../components/state-info');

const { serviceActions } = hass;

export default new Polymer({
  is: 'state-card-input_slider',

  properties: {
    inDialog: {
      type: Boolean,
      value: false,
    },

    stateObj: {
      type: Object,
      observer: 'stateObjectChanged',
    },
    min: {
      type: Number,
    },
    max: {
      type: Number,
    },
    step: {
      type: Number,
    },
    value: {
      type: Number,
    },
  },
  stateObjectChanged(newVal) {
    this.value = Number(newVal.state);
    this.min = Number(newVal.attributes.min);
    this.max = Number(newVal.attributes.max);
    this.step = Number(newVal.attributes.step);
  },
  selectedValueChanged() {
    if (this.value === Number(this.stateObj.state)) {
      return;
    }
    serviceActions.callService('input_slider', 'select_value', {
      value: this.value,
      entity_id: this.stateObj.entityId,
    });
  },
});
