import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import attributeClassNames from '../util/attribute-class-names';

const { serviceActions } = hass;
const ATTRIBUTE_CLASSES = ['away_mode', 'aux_heat'];

export default new Polymer({
  is: 'more-info-hvac',

  properties: {
    stateObj: {
      type: Object,
      observer: 'stateObjChanged',
    },

    tempMin: {
      type: Number,
    },

    tempMax: {
      type: Number,
    },

    humMin: {
      type: Number,
    },

    humMax: {
      type: Number,
    },

    targetTemperatureSliderValue: {
      type: Number,
    },

    targetHumiditySliderValue: {
      type: Number,
    },

    operationMode: {
      type: String,
      value: '',
    },

    operationIndex: {
      type: Number,
      value: 0,
      observer: 'handleOperationmodeChanged',
    },

    fanMode: {
      type: String,
      value: '',
    },

    fanIndex: {
      type: Number,
      value: 0,
      observer: 'handleFanmodeChanged',
    },

    swingMode: {
      type: String,
      value: '',
    },

    swingIndex: {
      type: Number,
      value: 0,
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
    this.targetTemperatureSliderValue = newVal.attributes.temperature;
    this.targetHumiditySliderValue = newVal.attributes.humidity;
    this.fanMode = newVal.attributes.fan;
    this.swingMode = newVal.attributes.swing_mode;
    this.operationMode = newVal.attributes.operation_mode;
    this.awayToggleChecked = newVal.attributes.away_mode === 'on';
    this.auxheatToggleChecked = newVal.attributes.aux_heat === 'on';

    this.tempMin = newVal.attributes.min_temp;
    this.tempMax = newVal.attributes.max_temp;
    this.humMin = newVal.attributes.min_humidity;
    this.humMax = newVal.attributes.max_humidity;

    if (newVal.attributes.fan_list !== null) {
      this.fanIndex = newVal.attributes.fan_list.indexOf(this.fanMode);
    }

    if (newVal.attributes.operation_list !== null) {
      this.operationIndex = newVal.attributes.operation_list.indexOf(this.operationMode);
    }

    if (newVal.attributes.swing_list !== null) {
      this.swingIndex = newVal.attributes.swing_list.indexOf(this.swingMode);
    }
  },

  computeClassNames(stateObj) {
    return attributeClassNames(stateObj, ATTRIBUTE_CLASSES);
  },

  targetTemperatureSliderChanged(ev) {
    serviceActions.callService('hvac', 'set_temperature', {
      entity_id: this.stateObj.entityId,
      temperature: ev.target.value,
    });
  },

  targetHumiditySliderChanged(ev) {
    serviceActions.callService('hvac', 'set_humidity', {
      entity_id: this.stateObj.entityId,
      humidity: ev.target.value,
    });
  },

  awayToggleChanged(ev) {
    const newVal = ev.target.checked;

    if (newVal && this.stateObj.attributes.away_mode === 'off') {
      this.service_set_away(true);
    } else if (!newVal && this.stateObj.attributes.away_mode === 'on') {
      this.service_set_away(false);
    }
  },

  auxToggleChanged(ev) {
    const newVal = ev.target.checked;
    if (newVal && this.stateObj.attributes.aux_heat === 'off') {
      this.service_set_aux_heat(true);
    } else if (!newVal && this.stateObj.attributes.aux_heat === 'on') {
      this.service_set_aux_heat(false);
    }
  },

  handleFanmodeChanged(fanIndex) {
    // Selected Option will transition to '' before transitioning to new value
    if (!this.stateObj
        || this.stateObj.attributes.fan_list === undefined
        || fanIndex >= this.stateObj.attributes.fan_list.length
    ) {
      return;
    }

    const fanInput = this.stateObj.attributes.fan_list[fanIndex];
    if (fanInput === this.stateObj.attributes.fan) {
      return;
    }

    serviceActions.callService('hvac', 'set_fan_mode', {
      entity_id: this.stateObj.entityId, fan: fanInput })

    .then(() => this.stateObjChanged(this.stateObj));
  },

  handleOperationmodeChanged(operationIndex) {
    // Selected Option will transition to '' before transitioning to new value
    if (!this.stateObj
        || this.stateObj.attributes.operation_list === undefined
        || operationIndex >= this.stateObj.attributes.operation_list.length
    ) {
      return;
    }

    const operationInput = this.stateObj.attributes.operation_list[operationIndex];
    if (operationInput === this.stateObj.attributes.operation_mode) {
      return;
    }

    serviceActions.callService('hvac', 'set_operation_mode', {
      entity_id: this.stateObj.entityId, operation_mode: operationInput })

    .then(() => this.stateObjChanged(this.stateObj));
  },

  handleSwingmodeChanged(swingIndex) {
    // Selected Option will transition to '' before transitioning to new value
    if (!this.stateObj
        || this.stateObj.attributes.swing_list === undefined
        || swingIndex >= this.stateObj.attributes.swing_list.length
    ) {
      return;
    }

    const swingInput = this.stateObj.attributes.swing_list[swingIndex];
    if (swingInput === this.stateObj.attributes.swing_mode) {
      return;
    }

    serviceActions.callService('hvac', 'set_swing_mode', {
      entity_id: this.stateObj.entityId, swing_mode: swingInput })

    .then(() => this.stateObjChanged(this.stateObj));
  },

  service_set_away(awayMode) {
    // We call stateChanged after a successful call to re-sync the toggle
    // with the state. It will be out of sync if our service call did not
    // result in the entity to be turned on. Since the state is not changing,
    // the resync is not called automatic.
    serviceActions.callService(
      'hvac', 'set_away_mode',
      { away_mode: awayMode, entity_id: this.stateObj.entityId })

    .then(() => this.stateObjChanged(this.stateObj));
  },

  service_set_aux_heat(auxheatMode) {
    // We call stateChanged after a successful call to re-sync the toggle
    // with the state. It will be out of sync if our service call did not
    // result in the entity to be turned on. Since the state is not changing,
    // the resync is not called automatic.
    serviceActions.callService(
      'hvac', 'set_aux_heat',
      { aux_heat: auxheatMode, entity_id: this.stateObj.entityId })

    .then(() => this.stateObjChanged(this.stateObj));
  },
});
