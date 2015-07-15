import { util, serviceActions } from 'home-assistant-js';

import Polymer from '../polymer';
import attributeClassNames from '../util/attribute-class-names';

const { temperatureUnits } = util;
const ATTRIBUTE_CLASSES = ['away_mode'];

export default Polymer({
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

  stateObjChanged(newVal, oldVal) {
    this.targetTemperatureSliderValue = this.stateObj.state;
    this.awayToggleChecked = this.stateObj.attributes.away_mode == 'on';

    if (this.stateObj.attributes.unit_of_measurement ===
        temperatureUnits.UNIT_TEMP_F) {
      this.tempMin = 45;
      this.tempMax = 95;
    } else {
      this.tempMin = 7;
      this.tempMax = 35;
    }
  },

  computeClassNames(stateObj) {
    return attributeClassNames(stateObj, ATTRIBUTE_CLASSES);
  },

  targetTemperatureSliderChanged(ev) {
    var temp = parseInt(ev.target.value);

    if(isNaN(temp)) return;

    serviceActions.callService('thermostat', 'set_temperature', {
      entity_id: this.stateObj.entityId,
      temperature: temp
    });
  },

  toggleChanged(ev) {
    var newVal = ev.target.checked;

    if(newVal && this.stateObj.attributes.away_mode === 'off') {
      this.service_set_away(true);
    } else if(!newVal && this.stateObj.attributes.away_mode === 'on') {
      this.service_set_away(false);
    }
  },

  service_set_away(away_mode) {
    // We call stateChanged after a successful call to re-sync the toggle
    // with the state. It will be out of sync if our service call did not
    // result in the entity to be turned on. Since the state is not changing,
    // the resync is not called automatic.
    serviceActions.callService(
      'thermostat', 'set_away_mode',
      { away_mode, entity_id: this.stateObj.entityId })

    .then(() => this.stateObjChanged(this.stateObj));
  },
});
