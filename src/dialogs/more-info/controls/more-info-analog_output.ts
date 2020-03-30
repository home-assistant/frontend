import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-attributes";
import "../../../components/ha-labeled-slider";
import "../../../components/ha-paper-dropdown-menu";

import { featureClassNames } from "../../../common/entity/feature_class_names";
import { EventsMixin } from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin EventsMixin
 */
class MoreInfoAnalogOutput extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="iron-flex"></style>
      <style>
        .value,
        .value_pct {
          max-height: 0px;
          overflow: hidden;
          transition: max-height 0.5s ease-in;
        }

        .has-color.is-on .segmentationContainer .segmentationButton {
          position: absolute;
          top: 11%;
          transform: translate(0%, 0%);
          width: 23px;
          height: 23px;
          padding: 0px;
          opacity: var(--dark-secondary-opacity);
        }

        .is-unavailable .control {
          max-height: 0px;
        }

        paper-item {
          cursor: pointer;
        }
      </style>

      <div class$="[[computeClassNames(stateObj)]]">
        <div class="control value_pct">
          <ha-labeled-slider
            caption="[[localize('ui.card.analog_output.value_pct')]]"
            icon="hass:brightness-5"
            min="1"
            max="100"
            value="{{value_pctSliderValue}}"
            on-change="value_pctSliderChanged"
          ></ha-labeled-slider>
        </div>

        <ha-attributes
          state-obj="[[stateObj]]"
          extra-filters="value_pct,value"
        ></ha-attributes>
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
        observer: "stateObjChanged",
      },

      value_pctSliderValue: {
        type: Number,
        value: 0,
      },
    };
  }

  stateObjChanged(newVal, oldVal) {
    const props = {
      value_pctSliderValue: 0,
    };

    if (newVal && newVal.state === "on") {
      props.brightnessSliderValue = newVal.attributes.value_pct;
    }

    this.setProperties(props);

    if (oldVal) {
      setTimeout(() => {
        this.fire("iron-resize");
      }, 500);
    }
  }

  computeClassNames(stateObj) {
    const classes = [featureClassNames(stateObj, FEATURE_CLASS_NAMES)];
    if (stateObj && stateObj.state === "on") {
      classes.push("is-on");
    }
    if (stateObj && stateObj.state === "unavailable") {
      classes.push("is-unavailable");
    }
    return classes.join(" ");
  }

  brightnessSliderChanged(ev) {
    var val_pct = parseInt(ev.target.value, 10);

    if (isNaN(val_pct)) return;

    this.hass.callService("analog_output", "turn_on", {
      entity_id: this.stateObj.entity_id,
      value_pct: val_pct,
    });
  }
}

customElements.define("more-info-analog_output", MoreInfoAnalogOutput);
