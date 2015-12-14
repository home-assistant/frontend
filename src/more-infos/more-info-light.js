import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import attributeClassNames from '../util/attribute-class-names';

require('../components/ha-color-picker');

const { serviceActions } = hass;
const ATTRIBUTE_CLASSES = ['brightness', 'rgb_color', 'color_temp'];

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

    ctSliderValue: {
      type: Number,
      value: 0,
    },
  },

  stateObjChanged(newVal) {
    if (newVal && newVal.state === 'on') {
      this.brightnessSliderValue = newVal.attributes.brightness;
      this.ctSliderValue = newVal.attributes.color_temp;
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

  ctSliderChanged(ev) {
    const ct = parseInt(ev.target.value, 10);

    if (isNaN(ct)) return;

    serviceActions.callService('light', 'turn_on', {
      entity_id: this.stateObj.entityId,
      color_temp: ct,
    });
  },

  colorPicked(ev) {
    const color = ev.detail.rgb;

    serviceActions.callService('light', 'turn_on', {
      entity_id: this.stateObj.entityId,
      rgb_color: [color.r, color.g, color.b],
    });
  },

});
