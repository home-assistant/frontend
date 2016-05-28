import Polymer from '../polymer';
import attributeClassNames from '../util/attribute-class-names';

require('../components/ha-color-picker');

const ATTRIBUTE_CLASSES = ['brightness', 'rgb_color', 'color_temp'];

function pickColor(hass, entityId, color) {
  hass.serviceActions.callService('light', 'turn_on', {
    entity_id: entityId,
    rgb_color: [color.r, color.g, color.b],
  });
}

export default new Polymer({
  is: 'more-info-light',

  properties: {
    hass: {
      type: Object,
    },

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
      this.hass.serviceActions.callTurnOff(this.stateObj.entityId);
    } else {
      this.hass.serviceActions.callService('light', 'turn_on', {
        entity_id: this.stateObj.entityId,
        brightness: bri,
      });
    }
  },

  ctSliderChanged(ev) {
    const ct = parseInt(ev.target.value, 10);

    if (isNaN(ct)) return;

    this.hass.serviceActions.callService('light', 'turn_on', {
      entity_id: this.stateObj.entityId,
      color_temp: ct,
    });
  },

  /**
   * Called when a new color has been picked. We will not respond to every
   * color pick event but have a pause between requests.
   */
  colorPicked(ev) {
    if (this.skipColorPicked) {
      this.colorChanged = true;
      return;
    }

    this.color = ev.detail.rgb;

    pickColor(this.hass, this.stateObj.entityId, this.color);

    this.colorChanged = false;
    this.skipColorPicked = true;

    this.colorDebounce = setTimeout(() => {
      if (this.colorChanged) {
        pickColor(this.hass, this.stateObj.entityId, this.color);
      }
      this.skipColorPicked = false;
    }, 500);
  },

});
