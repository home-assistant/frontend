import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-attributes.js';
import '../../../components/ha-color-picker.js';
import '../../../components/ha-labeled-slider.js';


import featureClassNames from '../../../common/entity/feature_class_names';
import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

const FEATURE_CLASS_NAMES = {
  1: 'has-brightness',
  2: 'has-color_temp',
  4: 'has-effect_list',
  16: 'has-color',
  128: 'has-white_value',
};
/*
 * @appliesMixin EventsMixin
 */
class MoreInfoLight extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
  <style include="iron-flex"></style>
  <style>
    .effect_list {
      padding-bottom: 16px;
    }

    .effect_list, .brightness, .color_temp, .white_value {
      max-height: 0px;
      overflow: hidden;
      transition: max-height .5s ease-in;
    }

    .color_temp {
      --ha-slider-background: -webkit-linear-gradient(right, rgb(255, 160, 0) 0%, white 50%, rgb(166, 209, 255) 100%);
      /* The color temp minimum value shouldn't be rendered differently. It's not "off". */
      --paper-slider-knob-start-border-color: var(--primary-color);
    }

    ha-color-picker {
      display: block;
      width: 100%;

      max-height: 0px;
      overflow: hidden;
      transition: max-height .5s ease-in;
    }

    .has-effect_list.is-on .effect_list,
    .has-brightness .brightness,
    .has-color_temp.is-on .color_temp,
    .has-white_value.is-on .white_value {
      max-height: 84px;
    }

    .has-color.is-on ha-color-picker {
      max-height: 500px;
      overflow: visible;
      --ha-color-picker-wheel-borderwidth: 5;
      --ha-color-picker-wheel-bordercolor: white;
      --ha-color-picker-wheel-shadow: none;
      --ha-color-picker-marker-borderwidth: 2;
      --ha-color-picker-marker-bordercolor: white;
    }

    .is-unavailable .control {
      max-height: 0px;
    }

    paper-item {
      cursor: pointer;
    }
  </style>

  <div class$="[[computeClassNames(stateObj)]]">

    <div class="control brightness">
      <ha-labeled-slider caption="[[localize('ui.card.light.brightness')]]" icon="hass:brightness-5" max="255" value="{{brightnessSliderValue}}" on-change="brightnessSliderChanged"></ha-labeled-slider>
    </div>

    <div class="control color_temp">
      <ha-labeled-slider caption="[[localize('ui.card.light.color_temperature')]]" icon="hass:thermometer" min="[[stateObj.attributes.min_mireds]]" max="[[stateObj.attributes.max_mireds]]" value="{{ctSliderValue}}" on-change="ctSliderChanged"></ha-labeled-slider>
    </div>

    <div class="control white_value">
      <ha-labeled-slider caption="[[localize('ui.card.light.white_value')]]" icon="hass:file-word-box" max="255" value="{{wvSliderValue}}" on-change="wvSliderChanged"></ha-labeled-slider>
    </div>

    <ha-color-picker class="control color" on-colorselected="colorPicked" desired-hs-color="{{colorPickerColor}}" throttle="500" hue-segments="24" saturation-segments="8">
    </ha-color-picker>

    <div class="control effect_list">
      <paper-dropdown-menu label-float="" dynamic-align="" label="[[localize('ui.card.light.effect')]]">
        <paper-listbox slot="dropdown-content" selected="{{effectIndex}}">
          <template is="dom-repeat" items="[[stateObj.attributes.effect_list]]">
            <paper-item>[[item]]</paper-item>
          </template>
        </paper-listbox>
      </paper-dropdown-menu>
    </div>

    <ha-attributes state-obj="[[stateObj]]" extra-filters="brightness,color_temp,white_value,effect_list,effect,hs_color,rgb_color,xy_color,min_mireds,max_mireds"></ha-attributes>
  </div>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      stateObj: {
        type: Object,
        observer: 'stateObjChanged',
      },

      effectIndex: {
        type: Number,
        value: -1,
        observer: 'effectChanged',
      },

      brightnessSliderValue: {
        type: Number,
        value: 0,
      },

      ctSliderValue: {
        type: Number,
        value: 0,
      },

      wvSliderValue: {
        type: Number,
        value: 0,
      },

      colorPickerColor: {
        type: Object,
      }
    };
  }

  stateObjChanged(newVal, oldVal) {
    const props = {
      brightnessSliderValue: 0
    };

    if (newVal && newVal.state === 'on') {
      props.brightnessSliderValue = newVal.attributes.brightness;
      props.ctSliderValue = newVal.attributes.color_temp;
      props.wvSliderValue = newVal.attributes.white_value;
      if (newVal.attributes.hs_color) {
        props.colorPickerColor = {
          h: newVal.attributes.hs_color[0],
          s: newVal.attributes.hs_color[1] / 100,
        };
      }
      if (newVal.attributes.effect_list) {
        props.effectIndex = newVal.attributes.effect_list.indexOf(newVal.attributes.effect);
      } else {
        props.effectIndex = -1;
      }
    }

    this.setProperties(props);

    if (oldVal) {
      setTimeout(() => {
        this.fire('iron-resize');
      }, 500);
    }
  }

  computeClassNames(stateObj) {
    const classes = [featureClassNames(stateObj, FEATURE_CLASS_NAMES)];
    if (stateObj && stateObj.state === 'on') {
      classes.push('is-on');
    }
    if (stateObj && stateObj.state === 'unavailable') {
      classes.push('is-unavailable');
    }
    return classes.join(' ');
  }

  effectChanged(effectIndex) {
    var effectInput;
    // Selected Option will transition to '' before transitioning to new value
    if (effectIndex === '' || effectIndex === -1) return;

    effectInput = this.stateObj.attributes.effect_list[effectIndex];
    if (effectInput === this.stateObj.attributes.effect) return;

    this.hass.callService('light', 'turn_on', {
      entity_id: this.stateObj.entity_id,
      effect: effectInput,
    });
  }

  brightnessSliderChanged(ev) {
    var bri = parseInt(ev.target.value, 10);

    if (isNaN(bri)) return;

    if (bri === 0) {
      this.hass.callService('light', 'turn_off', {
        entity_id: this.stateObj.entity_id,
      });
    } else {
      this.hass.callService('light', 'turn_on', {
        entity_id: this.stateObj.entity_id,
        brightness: bri,
      });
    }
  }

  ctSliderChanged(ev) {
    var ct = parseInt(ev.target.value, 10);

    if (isNaN(ct)) return;

    this.hass.callService('light', 'turn_on', {
      entity_id: this.stateObj.entity_id,
      color_temp: ct,
    });
  }

  wvSliderChanged(ev) {
    var wv = parseInt(ev.target.value, 10);

    if (isNaN(wv)) return;

    this.hass.callService('light', 'turn_on', {
      entity_id: this.stateObj.entity_id,
      white_value: wv,
    });
  }

  serviceChangeColor(hass, entityId, color) {
    hass.callService('light', 'turn_on', {
      entity_id: entityId,
      hs_color: [color.h, color.s * 100],
    });
  }

  /**
   * Called when a new color has been picked.
   * should be throttled with the 'throttle=' attribute of the color picker
   */
  colorPicked(ev) {
    this.serviceChangeColor(this.hass, this.stateObj.entity_id, ev.detail.hs);
  }
}

customElements.define('more-info-light', MoreInfoLight);
