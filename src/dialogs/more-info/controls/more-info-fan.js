import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-toggle-button/paper-toggle-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-attributes";

import attributeClassNames from "../../../common/entity/attribute_class_names";
import EventsMixin from "../../../mixins/events-mixin";
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

      paper-dropdown-menu {
        width: 100%;
      }

      paper-item {
        cursor: pointer;
      }
    </style>

    <div class$="[[computeClassNames(stateObj)]]">

      <div class="container-speed_list">
        <paper-dropdown-menu label-float="" dynamic-align="" label="[[localize('ui.card.fan.speed')]]">
          <paper-listbox slot="dropdown-content" selected="{{speedIndex}}">
            <template is="dom-repeat" items="[[stateObj.attributes.speed_list]]">
              <paper-item>[[item]]</paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
      </div>

      <div class="container-oscillating">
        <div class="center horizontal layout single-row">
          <div class="flex">[[localize('ui.card.fan.oscillate')]]</div>
          <paper-toggle-button checked="[[oscillationToggleChecked]]" on-change="oscillationToggleChanged">
          </paper-toggle-button>
        </div>
      </div>

      <div class="container-direction">
        <div class="direction">
          <div>[[localize('ui.card.fan.direction')]]</div>
          <paper-icon-button icon="hass:rotate-left" on-click="onDirectionLeft" title="Left" disabled="[[computeIsRotatingLeft(stateObj)]]"></paper-icon-button>
          <paper-icon-button icon="hass:rotate-right" on-click="onDirectionRight" title="Right" disabled="[[computeIsRotatingRight(stateObj)]]"></paper-icon-button>
        </div>
      </div>
    </div>

    <ha-attributes state-obj="[[stateObj]]" extra-filters="speed,speed_list,oscillating,direction"></ha-attributes>
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

      speedIndex: {
        type: Number,
        value: -1,
        observer: "speedChanged",
      },

      oscillationToggleChecked: {
        type: Boolean,
      },
    };
  }

  stateObjChanged(newVal, oldVal) {
    if (newVal) {
      this.setProperties({
        oscillationToggleChecked: newVal.attributes.oscillating,
        speedIndex: newVal.attributes.speed_list
          ? newVal.attributes.speed_list.indexOf(newVal.attributes.speed)
          : -1,
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

  speedChanged(speedIndex) {
    var speedInput;
    // Selected Option will transition to '' before transitioning to new value
    if (speedIndex === "" || speedIndex === -1) return;

    speedInput = this.stateObj.attributes.speed_list[speedIndex];
    if (speedInput === this.stateObj.attributes.speed) return;

    this.hass.callService("fan", "turn_on", {
      entity_id: this.stateObj.entity_id,
      speed: speedInput,
    });
  }

  oscillationToggleChanged(ev) {
    var oldVal = this.stateObj.attributes.oscillating;
    var newVal = ev.target.checked;

    if (oldVal === newVal) return;

    this.hass.callService("fan", "oscillate", {
      entity_id: this.stateObj.entity_id,
      oscillating: newVal,
    });
  }

  onDirectionLeft() {
    this.hass.callService("fan", "set_direction", {
      entity_id: this.stateObj.entity_id,
      direction: "reverse",
    });
  }

  onDirectionRight() {
    this.hass.callService("fan", "set_direction", {
      entity_id: this.stateObj.entity_id,
      direction: "forward",
    });
  }

  computeIsRotatingLeft(stateObj) {
    return stateObj.attributes.direction === "reverse";
  }

  computeIsRotatingRight(stateObj) {
    return stateObj.attributes.direction === "forward";
  }
}

customElements.define("more-info-fan", MoreInfoFan);
