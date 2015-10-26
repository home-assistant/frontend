import { serviceActions } from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import attributeClassNames from '../util/attribute-class-names';

const ATTRIBUTE_CLASSES = ['away_mode'];

export default new Polymer({
  is: 'more-info-thermostat',

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

    targetTemperatureSliderValue: {
      type: Number,
    },

    awayToggleChecked: {
      type: Boolean,
    },
  },

  stateObjChanged(newVal) {
    this.targetTemperatureSliderValue = newVal.attributes.temperature;
    this.awayToggleChecked = newVal.attributes.away_mode === 'on';

    this.tempMin = newVal.attributes.min_temp;
    this.tempMax = newVal.attributes.max_temp;
  },

  computeClassNames(stateObj) {
    return attributeClassNames(stateObj, ATTRIBUTE_CLASSES);
  },

  targetTemperatureSliderChanged(ev) {
    const temp = parseInt(ev.target.value, 10);

    if (isNaN(temp)) return;

    serviceActions.callService('thermostat', 'set_temperature', {
      entity_id: this.stateObj.entityId,
      temperature: temp,
    });
  },

  toggleChanged(ev) {
    const newVal = ev.target.checked;

    if (newVal && this.stateObj.attributes.away_mode === 'off') {
      this.service_set_away(true);
    } else if (!newVal && this.stateObj.attributes.away_mode === 'on') {
      this.service_set_away(false);
    }
  },

  service_set_away(awayMode) {
    // We call stateChanged after a successful call to re-sync the toggle
    // with the state. It will be out of sync if our service call did not
    // result in the entity to be turned on. Since the state is not changing,
    // the resync is not called automatic.
    serviceActions.callService(
      'thermostat', 'set_away_mode',
      { away_mode: awayMode, entity_id: this.stateObj.entityId })

    .then(() => this.stateObjChanged(this.stateObj));
  },
});
