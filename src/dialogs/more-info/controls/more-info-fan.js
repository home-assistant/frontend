import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { attributeClassNames } from "../../../common/entity/attribute_class_names";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import "../../../components/ha-icon-button";
import "../../../components/ha-labeled-slider";
import "../../../components/ha-paper-dropdown-menu";
import "../../../components/ha-switch";
import { EventsMixin } from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";
import { SUPPORT_SET_SPEED } from "../../../data/fan";

/*
 * @appliesMixin EventsMixin
 */
class MoreInfoFan extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="iron-flex"></style>
      <style>
        .container-preset_modes,
        .container-direction,
        .container-percentage,
        .container-oscillating {
          display: none;
        }

        .has-percentage .container-percentage,
        .has-preset_modes .container-preset_modes,
        .has-direction .container-direction,
        .has-oscillating .container-oscillating {
          display: block;
        }

        ha-paper-dropdown-menu {
          width: 100%;
        }

        paper-item {
          cursor: pointer;
        }
      </style>

      <div class$="[[computeClassNames(stateObj)]]">
        <div class="container-percentage">
          <ha-labeled-slider
            caption="[[localize('ui.card.fan.speed')]]"
            min="0"
            max="100"
            value="{{percentageSliderValue}}"
            on-change="percentageChanged"
            pin=""
            extra=""
          ></ha-labeled-slider>
        </div>

        <div class="container-preset_modes">
          <ha-paper-dropdown-menu
            label-float=""
            dynamic-align=""
            label="[[localize('ui.card.fan.preset_mode')]]"
          >
            <paper-listbox
              slot="dropdown-content"
              selected="[[stateObj.attributes.preset_mode]]"
              on-selected-changed="presetModeChanged"
              attr-for-selected="item-name"
            >
              <template
                is="dom-repeat"
                items="[[stateObj.attributes.preset_modes]]"
              >
                <paper-item item-name$="[[item]]">[[item]]</paper-item>
              </template>
            </paper-listbox>
          </ha-paper-dropdown-menu>
        </div>

        <div class="container-oscillating">
          <div class="center horizontal layout single-row">
            <div class="flex">[[localize('ui.card.fan.oscillate')]]</div>
            <ha-switch
              checked="[[oscillationToggleChecked]]"
              on-change="oscillationToggleChanged"
            >
            </ha-switch>
          </div>
        </div>

        <div class="container-direction">
          <div class="direction">
            <div>[[localize('ui.card.fan.direction')]]</div>
            <ha-icon-button
              icon="hass:rotate-left"
              on-click="onDirectionReverse"
              title="[[localize('ui.card.fan.reverse')]]"
              disabled="[[computeIsRotatingReverse(stateObj)]]"
            ></ha-icon-button>
            <ha-icon-button
              icon="hass:rotate-right"
              on-click="onDirectionForward"
              title="[[localize('ui.card.fan.forward')]]"
              disabled="[[computeIsRotatingForward(stateObj)]]"
            ></ha-icon-button>
          </div>
        </div>
      </div>

      <ha-attributes
        state-obj="[[stateObj]]"
        extra-filters="speed,preset_mode,preset_modes,speed_list,percentage,oscillating,direction"
      ></ha-attributes>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      stateObj: {
        type: Object,
        observer: "stateObjChanged",
      },

      oscillationToggleChecked: {
        type: Boolean,
      },

      percentageSliderValue: {
        type: Number,
      },
    };
  }

  stateObjChanged(newVal, oldVal) {
    if (newVal) {
      this.setProperties({
        oscillationToggleChecked: newVal.attributes.oscillating,
        percentageSliderValue: newVal.attributes.percentage,
      });
    }

    if (oldVal) {
      setTimeout(() => {
        this.fire("iron-resize");
      }, 500);
    }
  }

  computeClassNames(stateObj) {
    return (
      "more-info-fan " +
      (supportsFeature(stateObj, SUPPORT_SET_SPEED) ? "has-percentage " : "") +
      (stateObj.attributes.preset_modes &&
      stateObj.attributes.preset_modes.length
        ? "has-preset_modes "
        : "") +
      attributeClassNames(stateObj, ["oscillating", "direction"])
    );
  }

  presetModeChanged(ev) {
    const oldVal = this.stateObj.attributes.preset_mode;
    const newVal = ev.detail.value;

    if (!newVal || oldVal === newVal) return;

    this.hass.callService("fan", "set_preset_mode", {
      entity_id: this.stateObj.entity_id,
      preset_mode: newVal,
    });
  }

  percentageChanged(ev) {
    const oldVal = parseInt(this.stateObj.attributes.percentage, 10);
    const newVal = ev.target.value;

    if (isNaN(newVal) || oldVal === newVal) return;

    this.hass.callService("fan", "set_percentage", {
      entity_id: this.stateObj.entity_id,
      percentage: newVal,
    });
  }

  oscillationToggleChanged(ev) {
    const oldVal = this.stateObj.attributes.oscillating;
    const newVal = ev.target.checked;

    if (oldVal === newVal) return;

    this.hass.callService("fan", "oscillate", {
      entity_id: this.stateObj.entity_id,
      oscillating: newVal,
    });
  }

  onDirectionReverse() {
    this.hass.callService("fan", "set_direction", {
      entity_id: this.stateObj.entity_id,
      direction: "reverse",
    });
  }

  onDirectionForward() {
    this.hass.callService("fan", "set_direction", {
      entity_id: this.stateObj.entity_id,
      direction: "forward",
    });
  }

  computeIsRotatingReverse(stateObj) {
    return stateObj.attributes.direction === "reverse";
  }

  computeIsRotatingForward(stateObj) {
    return stateObj.attributes.direction === "forward";
  }
}

customElements.define("more-info-fan", MoreInfoFan);
