import { serviceActions } from 'home-assistant-js';

import Polymer from '../polymer';
import attributeClassNames from '../util/attribute-class-names';

require('../components/ha-color-picker');

const ATTRIBUTE_CLASSES = ['brightness', 'xy_color'];

export default new Polymer({
  is: 'more-info-light',

  properties: {
    stateObj: {
      type: Object,
      observer: 'stateObjChanged',
    },

    brightnessSliderValue: {
      type: Number,
      value: 0,
    },
  },

  stateObjChanged(newVal) {
    if (newVal && newVal.state === 'on') {
      this.brightnessSliderValue = newVal.attributes.brightness;
    }

    this.async(() => this.fire('iron-resize'), 500);
  },

  computeClassNames(stateObj) {
    return attributeClassNames(stateObj, ATTRIBUTE_CLASSES);
  },

  brightnessSliderChanged(ev) {
    const bri = parseInt(ev.target.value, 10);

    if (isNaN(bri)) return;

    if (bri === 0) {
      serviceActions.callTurnOff(this.stateObj.entityId);
    } else {
      serviceActions.callService('light', 'turn_on', {
        entity_id: this.stateObj.entityId,
        brightness: bri,
      });
    }
  },

  colorPicked(ev) {
    const color = ev.detail.rgb;

    serviceActions.callService('light', 'turn_on', {
      entity_id: this.stateObj.entityId,
      rgb_color: [color.r, color.g, color.b],
    });
  },

});
