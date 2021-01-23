import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { attributeClassNames } from "../../../common/entity/attribute_class_names";
import "../../../components/ha-attributes";
import "../../../components/ha-icon-button";
import "../../../components/ha-labeled-slider";
import "../../../components/ha-paper-dropdown-menu";
import "../../../components/ha-switch";
import { EventsMixin } from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin EventsMixin
 */
class MoreInfoFan extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="iron-flex"></style>
      <style>
        .container-speed_list,
        .container-direction,
        .container-oscillating {
          display: none;
        }

        .has-speed_list .container-speed_list,
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
        extra-filters="speed,speed_list,percentage,oscillating,direction"
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
      attributeClassNames(stateObj, ["oscillating", "speed_list", "direction"])
    );
  }

  percentageChanged(ev) {
    const oldVal = parseInt(this.stateObj.attributes.percentage, 10);
    const newVal = ev.target.value;

    if (isNaN(newVal) || isNaN(oldVal) || oldVal === newVal) return;

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
