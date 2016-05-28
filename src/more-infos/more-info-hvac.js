import Polymer from '../polymer';
import attributeClassNames from '../util/attribute-class-names';

const ATTRIBUTE_CLASSES = [
  'away_mode',
  'aux_heat',
  'temperature',
  'humidity',
  'operation_list',
  'fan_list',
  'swing_list',
];

export default new Polymer({
  is: 'more-info-hvac',

  properties: {
    hass: {
      type: Object,
    },

    stateObj: {
      type: Object,
      observer: 'stateObjChanged',
    },

    operationIndex: {
      type: Number,
      value: -1,
      observer: 'handleOperationmodeChanged',
    },

    fanIndex: {
      type: Number,
      value: -1,
      observer: 'handleFanmodeChanged',
    },

    swingIndex: {
      type: Number,
      value: -1,
      observer: 'handleSwingmodeChanged',
    },

    awayToggleChecked: {
      type: Boolean,
    },

    auxToggleChecked: {
      type: Boolean,
    },
  },

  stateObjChanged(newVal) {
    this.awayToggleChecked = newVal.attributes.away_mode === 'on';
    this.auxheatToggleChecked = newVal.attributes.aux_heat === 'on';

    if (newVal.attributes.fan_list) {
      this.fanIndex = newVal.attributes.fan_list.indexOf(
        newVal.attributes.fan_mode);
    } else {
      this.fanIndex = -1;
    }

    if (newVal.attributes.operation_list) {
      this.operationIndex = newVal.attributes.operation_list.indexOf(
        newVal.attributes.operation_mode);
    } else {
      this.operationIndex = -1;
    }

    if (newVal.attributes.swing_list) {
      this.swingIndex = newVal.attributes.swing_list.indexOf(
        newVal.attributes.swing_mode);
    } else {
      this.swingIndex = -1;
    }

    this.async(() => this.fire('iron-resize'), 500);
  },

  computeClassNames(stateObj) {
    return `more-info-hvac ${attributeClassNames(stateObj, ATTRIBUTE_CLASSES)}`;
  },

  targetTemperatureSliderChanged(ev) {
    const temperature = ev.target.value;

    if (temperature === this.stateObj.attributes.temperature) return;

    this.callServiceHelper('set_temperature', { temperature });
  },

  targetHumiditySliderChanged(ev) {
    const humidity = ev.target.value;

    if (humidity === this.stateObj.attributes.humidity) return;

    this.callServiceHelper('set_humidity', { humidity });
  },

  awayToggleChanged(ev) {
    const oldVal = this.stateObj.attributes.away_mode === 'on';
    const newVal = ev.target.checked;

    if (oldVal === newVal) return;

    this.callServiceHelper('set_away_mode', { away_mode: newVal });
  },

  auxToggleChanged(ev) {
    const oldVal = this.stateObj.attributes.aux_heat === 'on';
    const newVal = ev.target.checked;

    if (oldVal === newVal) return;

    this.callServiceHelper('set_aux_heat', { aux_heat: newVal });
  },

  handleFanmodeChanged(fanIndex) {
    // Selected Option will transition to '' before transitioning to new value
    if (fanIndex === '' || fanIndex === -1) return;

    const fanInput = this.stateObj.attributes.fan_list[fanIndex];
    if (fanInput === this.stateObj.attributes.fan_mode) return;

    this.callServiceHelper('set_fan_mode', { fan_mode: fanInput });
  },

  handleOperationmodeChanged(operationIndex) {
    // Selected Option will transition to '' before transitioning to new value
    if (operationIndex === '' || operationIndex === -1) return;

    const operationInput = this.stateObj.attributes.operation_list[operationIndex];
    if (operationInput === this.stateObj.attributes.operation_mode) return;

    this.callServiceHelper('set_operation_mode', { operation_mode: operationInput });
  },

  handleSwingmodeChanged(swingIndex) {
    // Selected Option will transition to '' before transitioning to new value
    if (swingIndex === '' || swingIndex === -1) return;

    const swingInput = this.stateObj.attributes.swing_list[swingIndex];
    if (swingInput === this.stateObj.attributes.swing_mode) return;

    this.callServiceHelper('set_swing_mode', { swing_mode: swingInput });
  },

  callServiceHelper(service, data) {
    // We call stateChanged after a successful call to re-sync the inputs
    // with the state. It will be out of sync if our service call did not
    // result in the entity to be turned on. Since the state is not changing,
    // the resync is not called automatic.
    /* eslint-disable no-param-reassign */
    data.entity_id = this.stateObj.entityId;
    /* eslint-enable no-param-reassign */
    this.hass.serviceActions.callService('hvac', service, data)
      .then(() => this.stateObjChanged(this.stateObj));
  },
});
