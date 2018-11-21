import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-toggle-button/paper-toggle-button";
import { timeOut } from "@polymer/polymer/lib/utils/async";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-climate-control";
import "../../../components/ha-paper-slider";

import attributeClassNames from "../../../common/entity/attribute_class_names";
import featureClassNames from "../../../common/entity/feature_class_names";

import EventsMixin from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class MoreInfoClimate extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="iron-flex"></style>
      <style>
        :host {
          color: var(--primary-text-color);
        }

        .container-on,
        .container-away_mode,
        .container-aux_heat,
        .container-temperature,
        .container-humidity,
        .container-operation_list,
        .container-fan_list,
        .container-swing_list {
          display: none;
        }

        .has-on .container-on,
        .has-away_mode .container-away_mode,
        .has-aux_heat .container-aux_heat,
        .has-target_temperature .container-temperature,
        .has-target_temperature_low .container-temperature,
        .has-target_temperature_high .container-temperature,
        .has-target_humidity .container-humidity,
        .has-operation_mode .container-operation_list,
        .has-fan_mode .container-fan_list,
        .has-swing_list .container-swing_list,
        .has-swing_mode .container-swing_list {
          display: block;
          margin-bottom: 5px;
        }

        .container-operation_list iron-icon,
        .container-fan_list iron-icon,
        .container-swing_list iron-icon {
          margin: 22px 16px 0 0;
        }

        paper-dropdown-menu {
          width: 100%;
        }

        paper-item {
          cursor: pointer;
        }

        ha-paper-slider {
          width: 100%;
        }

        .container-humidity .single-row {
            display: flex;
            height: 50px;
        }

        .target-humidity {
          width: 90px;
          font-size: 200%;
          margin: auto;
        }

        ha-climate-control.range-control-left,
        ha-climate-control.range-control-right {
          float: left;
          width: 46%;
        }
        ha-climate-control.range-control-left {
          margin-right: 4%;
        }
        ha-climate-control.range-control-right {
          margin-left: 4%;
        }

        .humidity {
          --paper-slider-active-color: var(--paper-blue-400);
          --paper-slider-secondary-color: var(--paper-blue-400);
        }

        .single-row {
          padding: 8px 0;
        }
        }
      </style>

      <div class$="[[computeClassNames(stateObj)]]">
        <template is="dom-if" if="[[supportsOn(stateObj)]]">
          <div class="container-on">
            <div class="center horizontal layout single-row">
              <div class="flex">[[localize('ui.card.climate.on_off')]]</div>
              <paper-toggle-button
                checked="[[onToggleChecked]]"
                on-change="onToggleChanged"
              >
              </paper-toggle-button>
            </div>
          </div>
        </template>

        <div class="container-temperature">
          <div class$="[[stateObj.attributes.operation_mode]]">
            <div hidden$="[[!supportsTemperatureControls(stateObj)]]">
              [[localize('ui.card.climate.target_temperature')]]
            </div>
            <template is="dom-if" if="[[supportsTemperature(stateObj)]]">
              <ha-climate-control
                value="[[stateObj.attributes.temperature]]"
                units="[[hass.config.unit_system.temperature]]"
                step="[[computeTemperatureStepSize(hass, stateObj)]]"
                min="[[stateObj.attributes.min_temp]]"
                max="[[stateObj.attributes.max_temp]]"
                on-change="targetTemperatureChanged"
              >
              </ha-climate-control>
            </template>
            <template is="dom-if" if="[[supportsTemperatureRange(stateObj)]]">
              <ha-climate-control
                value="[[stateObj.attributes.target_temp_low]]"
                units="[[hass.config.unit_system.temperature]]"
                step="[[computeTemperatureStepSize(hass, stateObj)]]"
                min="[[stateObj.attributes.min_temp]]"
                max="[[stateObj.attributes.target_temp_high]]"
                class="range-control-left"
                on-change="targetTemperatureLowChanged"
              >
              </ha-climate-control>
              <ha-climate-control
                value="[[stateObj.attributes.target_temp_high]]"
                units="[[hass.config.unit_system.temperature]]"
                step="[[computeTemperatureStepSize(hass, stateObj)]]"
                min="[[stateObj.attributes.target_temp_low]]"
                max="[[stateObj.attributes.max_temp]]"
                class="range-control-right"
                on-change="targetTemperatureHighChanged"
              >
              </ha-climate-control>
            </template>
          </div>
        </div>

        <template is="dom-if" if="[[supportsHumidity(stateObj)]]">
          <div class="container-humidity">
            <div>[[localize('ui.card.climate.target_humidity')]]</div>
            <div class="single-row">
              <div class="target-humidity">
                [[stateObj.attributes.humidity]] %
              </div>
              <ha-paper-slider
                class="humidity"
                min="[[stateObj.attributes.min_humidity]]"
                max="[[stateObj.attributes.max_humidity]]"
                secondary-progress="[[stateObj.attributes.max_humidity]]"
                step="1"
                pin=""
                value="[[stateObj.attributes.humidity]]"
                on-change="targetHumiditySliderChanged"
                ignore-bar-touch=""
              >
              </ha-paper-slider>
            </div>
          </div>
        </template>

        <template is="dom-if" if="[[supportsOperationMode(stateObj)]]">
          <div class="container-operation_list">
            <div class="controls">
              <paper-dropdown-menu
                label-float=""
                dynamic-align=""
                label="[[localize('ui.card.climate.operation')]]"
              >
                <paper-listbox
                  slot="dropdown-content"
                  selected="{{operationIndex}}"
                >
                  <template
                    is="dom-repeat"
                    items="[[stateObj.attributes.operation_list]]"
                    on-dom-change="handleOperationListUpdate"
                  >
                    <paper-item
                      >[[_localizeOperationMode(localize, item)]]</paper-item
                    >
                  </template>
                </paper-listbox>
              </paper-dropdown-menu>
            </div>
          </div>
        </template>

        <template is="dom-if" if="[[supportsFanMode(stateObj)]]">
          <div class="container-fan_list">
            <paper-dropdown-menu
              label-float=""
              dynamic-align=""
              label="[[localize('ui.card.climate.fan_mode')]]"
            >
              <paper-listbox slot="dropdown-content" selected="{{fanIndex}}">
                <template
                  is="dom-repeat"
                  items="[[stateObj.attributes.fan_list]]"
                  on-dom-change="handleFanListUpdate"
                >
                  <paper-item>[[item]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
        </template>

        <template is="dom-if" if="[[supportsSwingMode(stateObj)]]">
          <div class="container-swing_list">
            <paper-dropdown-menu
              label-float=""
              dynamic-align=""
              label="[[localize('ui.card.climate.swing_mode')]]"
            >
              <paper-listbox slot="dropdown-content" selected="{{swingIndex}}">
                <template
                  is="dom-repeat"
                  items="[[stateObj.attributes.swing_list]]"
                  on-dom-change="handleSwingListUpdate"
                >
                  <paper-item>[[item]]</paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
        </template>

        <template is="dom-if" if="[[supportsAwayMode(stateObj)]]">
          <div class="container-away_mode">
            <div class="center horizontal layout single-row">
              <div class="flex">[[localize('ui.card.climate.away_mode')]]</div>
              <paper-toggle-button
                checked="[[awayToggleChecked]]"
                on-change="awayToggleChanged"
              >
              </paper-toggle-button>
            </div>
          </div>
        </template>

        <template is="dom-if" if="[[supportsAuxHeat(stateObj)]]">
          <div class="container-aux_heat">
            <div class="center horizontal layout single-row">
              <div class="flex">[[localize('ui.card.climate.aux_heat')]]</div>
              <paper-toggle-button
                checked="[[auxToggleChecked]]"
                on-change="auxToggleChanged"
              >
              </paper-toggle-button>
            </div>
          </div>
        </template>
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

      operationIndex: {
        type: Number,
        value: -1,
        observer: "handleOperationmodeChanged",
      },

      fanIndex: {
        type: Number,
        value: -1,
        observer: "handleFanmodeChanged",
      },

      swingIndex: {
        type: Number,
        value: -1,
        observer: "handleSwingmodeChanged",
      },
      awayToggleChecked: Boolean,
      auxToggleChecked: Boolean,
      onToggleChecked: Boolean,
    };
  }

  stateObjChanged(newVal, oldVal) {
    if (newVal) {
      this.setProperties({
        awayToggleChecked: newVal.attributes.away_mode === "on",
        auxToggleChecked: newVal.attributes.aux_heat === "on",
        onToggleChecked: newVal.state !== "off",
      });
    }

    if (oldVal) {
      this._debouncer = Debouncer.debounce(
        this._debouncer,
        timeOut.after(500),
        () => {
          this.fire("iron-resize");
        }
      );
    }
  }

  handleOperationListUpdate() {
    // force polymer to recognize selected item change (to update actual label)
    this.operationIndex = -1;
    if (this.stateObj.attributes.operation_list) {
      this.operationIndex = this.stateObj.attributes.operation_list.indexOf(
        this.stateObj.attributes.operation_mode
      );
    }
  }

  handleSwingListUpdate() {
    // force polymer to recognize selected item change (to update actual label)
    this.swingIndex = -1;
    if (this.stateObj.attributes.swing_list) {
      this.swingIndex = this.stateObj.attributes.swing_list.indexOf(
        this.stateObj.attributes.swing_mode
      );
    }
  }

  handleFanListUpdate() {
    // force polymer to recognize selected item change (to update actual label)
    this.fanIndex = -1;
    if (this.stateObj.attributes.fan_list) {
      this.fanIndex = this.stateObj.attributes.fan_list.indexOf(
        this.stateObj.attributes.fan_mode
      );
    }
  }

  computeTemperatureStepSize(hass, stateObj) {
    if (stateObj.attributes.target_temp_step) {
      return stateObj.attributes.target_temp_step;
    }
    if (hass.config.unit_system.temperature.indexOf("F") !== -1) {
      return 1;
    }
    return 0.5;
  }

  supportsTemperatureControls(stateObj) {
    return (
      this.supportsTemperature(stateObj) ||
      this.supportsTemperatureRange(stateObj)
    );
  }

  supportsTemperature(stateObj) {
    return (
      (stateObj.attributes.supported_features & 1) !== 0 &&
      typeof stateObj.attributes.temperature === "number"
    );
  }

  supportsTemperatureRange(stateObj) {
    return (
      (stateObj.attributes.supported_features & 6) !== 0 &&
      (typeof stateObj.attributes.target_temp_low === "number" ||
        typeof stateObj.attributes.target_temp_high === "number")
    );
  }

  supportsHumidity(stateObj) {
    return (stateObj.attributes.supported_features & 8) !== 0;
  }

  supportsFanMode(stateObj) {
    return (stateObj.attributes.supported_features & 64) !== 0;
  }

  supportsOperationMode(stateObj) {
    return (stateObj.attributes.supported_features & 128) !== 0;
  }

  supportsSwingMode(stateObj) {
    return (stateObj.attributes.supported_features & 512) !== 0;
  }

  supportsAwayMode(stateObj) {
    return (stateObj.attributes.supported_features & 1024) !== 0;
  }

  supportsAuxHeat(stateObj) {
    return (stateObj.attributes.supported_features & 2048) !== 0;
  }

  supportsOn(stateObj) {
    return (stateObj.attributes.supported_features & 4096) !== 0;
  }

  computeClassNames(stateObj) {
    const _featureClassNames = {
      1: "has-target_temperature",
      2: "has-target_temperature_high",
      4: "has-target_temperature_low",
      8: "has-target_humidity",
      16: "has-target_humidity_high",
      32: "has-target_humidity_low",
      64: "has-fan_mode",
      128: "has-operation_mode",
      256: "has-hold_mode",
      512: "has-swing_mode",
      1024: "has-away_mode",
      2048: "has-aux_heat",
      4096: "has-on",
    };

    var classes = [
      attributeClassNames(stateObj, [
        "current_temperature",
        "current_humidity",
      ]),
      featureClassNames(stateObj, _featureClassNames),
    ];

    classes.push("more-info-climate");

    return classes.join(" ");
  }

  targetTemperatureChanged(ev) {
    const temperature = ev.target.value;
    if (temperature === this.stateObj.attributes.temperature) return;
    this.callServiceHelper("set_temperature", { temperature: temperature });
  }

  targetTemperatureLowChanged(ev) {
    const targetTempLow = ev.currentTarget.value;
    if (targetTempLow === this.stateObj.attributes.target_temp_low) return;
    this.callServiceHelper("set_temperature", {
      target_temp_low: targetTempLow,
      target_temp_high: this.stateObj.attributes.target_temp_high,
    });
  }

  targetTemperatureHighChanged(ev) {
    const targetTempHigh = ev.currentTarget.value;
    if (targetTempHigh === this.stateObj.attributes.target_temp_high) return;
    this.callServiceHelper("set_temperature", {
      target_temp_low: this.stateObj.attributes.target_temp_low,
      target_temp_high: targetTempHigh,
    });
  }

  targetHumiditySliderChanged(ev) {
    const humidity = ev.target.value;
    if (humidity === this.stateObj.attributes.humidity) return;
    this.callServiceHelper("set_humidity", { humidity: humidity });
  }

  awayToggleChanged(ev) {
    const oldVal = this.stateObj.attributes.away_mode === "on";
    const newVal = ev.target.checked;
    if (oldVal === newVal) return;
    this.callServiceHelper("set_away_mode", { away_mode: newVal });
  }

  auxToggleChanged(ev) {
    const oldVal = this.stateObj.attributes.aux_heat === "on";
    const newVal = ev.target.checked;
    if (oldVal === newVal) return;
    this.callServiceHelper("set_aux_heat", { aux_heat: newVal });
  }

  onToggleChanged(ev) {
    const oldVal = this.stateObj.state !== "off";
    const newVal = ev.target.checked;
    if (oldVal === newVal) return;
    this.callServiceHelper(newVal ? "turn_on" : "turn_off", {});
  }

  handleFanmodeChanged(fanIndex) {
    // Selected Option will transition to '' before transitioning to new value
    if (fanIndex === "" || fanIndex === -1) return;
    const fanInput = this.stateObj.attributes.fan_list[fanIndex];
    if (fanInput === this.stateObj.attributes.fan_mode) return;
    this.callServiceHelper("set_fan_mode", { fan_mode: fanInput });
  }

  handleOperationmodeChanged(operationIndex) {
    // Selected Option will transition to '' before transitioning to new value
    if (operationIndex === "" || operationIndex === -1) return;
    const operationInput = this.stateObj.attributes.operation_list[
      operationIndex
    ];
    if (operationInput === this.stateObj.attributes.operation_mode) return;

    this.callServiceHelper("set_operation_mode", {
      operation_mode: operationInput,
    });
  }

  handleSwingmodeChanged(swingIndex) {
    // Selected Option will transition to '' before transitioning to new value
    if (swingIndex === "" || swingIndex === -1) return;
    const swingInput = this.stateObj.attributes.swing_list[swingIndex];
    if (swingInput === this.stateObj.attributes.swing_mode) return;
    this.callServiceHelper("set_swing_mode", { swing_mode: swingInput });
  }

  callServiceHelper(service, data) {
    // We call stateChanged after a successful call to re-sync the inputs
    // with the state. It will be out of sync if our service call did not
    // result in the entity to be turned on. Since the state is not changing,
    // the resync is not called automatic.
    /* eslint-disable no-param-reassign */
    data.entity_id = this.stateObj.entity_id;
    /* eslint-enable no-param-reassign */
    this.hass.callService("climate", service, data).then(() => {
      this.stateObjChanged(this.stateObj);
    });
  }

  _localizeOperationMode(localize, mode) {
    return localize(`state.climate.${mode}`) || mode;
  }
}

customElements.define("more-info-climate", MoreInfoClimate);
