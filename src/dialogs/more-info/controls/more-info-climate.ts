import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  LitElement,
  html,
  TemplateResult,
  CSSResult,
  css,
  property,
  PropertyValues,
} from "lit-element";

import "../../../components/ha-climate-control";
import "../../../components/ha-paper-slider";
import "../../../components/ha-paper-dropdown-menu";
import "../../../components/ha-switch";

import { supportsFeature } from "../../../common/entity/supports-feature";

import { computeRTLDirection } from "../../../common/util/compute_rtl";
import { HomeAssistant } from "../../../types";
import {
  ClimateEntity,
  CLIMATE_SUPPORT_TARGET_TEMPERATURE,
  CLIMATE_SUPPORT_TARGET_TEMPERATURE_RANGE,
  CLIMATE_SUPPORT_TARGET_HUMIDITY,
  CLIMATE_SUPPORT_FAN_MODE,
  CLIMATE_SUPPORT_SWING_MODE,
  CLIMATE_SUPPORT_AUX_HEAT,
  CLIMATE_SUPPORT_PRESET_MODE,
  compareClimateHvacModes,
} from "../../../data/climate";
import { fireEvent } from "../../../common/dom/fire_event";
import { classMap } from "lit-html/directives/class-map";

class MoreInfoClimate extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public stateObj?: ClimateEntity;
  private _resizeDebounce?: number;

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html``;
    }

    const hass = this.hass;
    const stateObj = this.stateObj;

    const supportTargetTemperature = supportsFeature(
      stateObj,
      CLIMATE_SUPPORT_TARGET_TEMPERATURE
    );
    const supportTargetTemperatureRange = supportsFeature(
      stateObj,
      CLIMATE_SUPPORT_TARGET_TEMPERATURE_RANGE
    );
    const supportTargetHumidity = supportsFeature(
      stateObj,
      CLIMATE_SUPPORT_TARGET_HUMIDITY
    );
    const supportFanMode = supportsFeature(stateObj, CLIMATE_SUPPORT_FAN_MODE);
    const supportPresetMode = supportsFeature(
      stateObj,
      CLIMATE_SUPPORT_PRESET_MODE
    );
    const supportSwingMode = supportsFeature(
      stateObj,
      CLIMATE_SUPPORT_SWING_MODE
    );
    const supportAuxHeat = supportsFeature(stateObj, CLIMATE_SUPPORT_AUX_HEAT);

    const temperatureStepSize =
      stateObj.attributes.target_temp_step ||
      (hass.config.unit_system.temperature.indexOf("F") === -1 ? 0.5 : 1);

    const rtlDirection = computeRTLDirection(hass);

    return html`
      <div
        class=${classMap({
          "has-current_temperature":
            "current_temperature" in stateObj.attributes,
          "has-current_humidity": "current_humidity" in stateObj.attributes,
          "has-target_temperature": supportTargetTemperature,
          "has-target_temperature_range": supportTargetTemperatureRange,
          "has-target_humidity": supportTargetHumidity,
          "has-fan_mode": supportFanMode,
          "has-swing_mode": supportSwingMode,
          "has-aux_heat": supportAuxHeat,
          "has-preset_mode": supportPresetMode,
        })}
      >
        <div class="container-temperature">
          <div class=${stateObj.state}>
            ${supportTargetTemperature || supportTargetTemperatureRange
              ? html`
                  <div>
                    ${hass.localize("ui.card.climate.target_temperature")}
                  </div>
                `
              : ""}
            ${stateObj.attributes.temperature !== undefined &&
            stateObj.attributes.temperature !== null
              ? html`
                  <ha-climate-control
                    .value=${stateObj.attributes.temperature}
                    .units=${hass.config.unit_system.temperature}
                    .step=${temperatureStepSize}
                    .min=${stateObj.attributes.min_temp}
                    .max=${stateObj.attributes.max_temp}
                    @change=${this._targetTemperatureChanged}
                  ></ha-climate-control>
                `
              : ""}
            ${(stateObj.attributes.target_temp_low !== undefined &&
              stateObj.attributes.target_temp_low !== null) ||
            (stateObj.attributes.target_temp_high !== undefined &&
              stateObj.attributes.target_temp_high !== null)
              ? html`
                  <ha-climate-control
                    .value=${stateObj.attributes.target_temp_low}
                    .units=${hass.config.unit_system.temperature}
                    .step=${temperatureStepSize}
                    .min=${stateObj.attributes.min_temp}
                    .max=${stateObj.attributes.target_temp_high}
                    class="range-control-left"
                    @change=${this._targetTemperatureLowChanged}
                  ></ha-climate-control>
                  <ha-climate-control
                    .value=${stateObj.attributes.target_temp_high}
                    .units=${hass.config.unit_system.temperature}
                    .step=${temperatureStepSize}
                    .min=${stateObj.attributes.target_temp_low}
                    .max=${stateObj.attributes.max_temp}
                    class="range-control-right"
                    @change=${this._targetTemperatureHighChanged}
                  ></ha-climate-control>
                `
              : ""}
          </div>
        </div>

        ${supportTargetHumidity
          ? html`
              <div class="container-humidity">
                <div>${hass.localize("ui.card.climate.target_humidity")}</div>
                <div class="single-row">
                  <div class="target-humidity">
                    ${stateObj.attributes.humidity} %
                  </div>
                  <ha-paper-slider
                    class="humidity"
                    step="1"
                    pin
                    ignore-bar-touch
                    dir=${rtlDirection}
                    .min=${stateObj.attributes.min_humidity}
                    .max=${stateObj.attributes.max_humidity}
                    .secondaryProgress=${stateObj.attributes.max_humidity}
                    .value=${stateObj.attributes.humidity}
                    @change=${this._targetHumiditySliderChanged}
                  >
                  </ha-paper-slider>
                </div>
              </div>
            `
          : ""}

        <div class="container-hvac_modes">
          <div class="controls">
            <ha-paper-dropdown-menu
              label-float
              dynamic-align
              .label=${hass.localize("ui.card.climate.operation")}
            >
              <paper-listbox
                slot="dropdown-content"
                attr-for-selected="item-name"
                .selected=${stateObj.state}
                @selected-changed=${this._handleOperationmodeChanged}
              >
                ${stateObj.attributes.hvac_modes
                  .concat()
                  .sort(compareClimateHvacModes)
                  .map(
                    (mode) => html`
                      <paper-item item-name=${mode}>
                        ${hass.localize(`state.climate.${mode}`)}
                      </paper-item>
                    `
                  )}
              </paper-listbox>
            </ha-paper-dropdown-menu>
          </div>
        </div>

        ${supportPresetMode
          ? html`
              <div class="container-preset_modes">
                <ha-paper-dropdown-menu
                  label-float
                  dynamic-align
                  .label=${hass.localize("ui.card.climate.preset_mode")}
                >
                  <paper-listbox
                    slot="dropdown-content"
                    attr-for-selected="item-name"
                    .selected=${stateObj.attributes.preset_mode}
                    @selected-changed=${this._handlePresetmodeChanged}
                  >
                    ${stateObj.attributes.preset_modes!.map(
                      (mode) => html`
                        <paper-item item-name=${mode}>
                          ${hass.localize(
                            `state_attributes.climate.preset_mode.${mode}`
                          ) || mode}
                        </paper-item>
                      `
                    )}
                  </paper-listbox>
                </ha-paper-dropdown-menu>
              </div>
            `
          : ""}
        ${supportFanMode
          ? html`
              <div class="container-fan_list">
                <ha-paper-dropdown-menu
                  label-float
                  dynamic-align
                  .label=${hass.localize("ui.card.climate.fan_mode")}
                >
                  <paper-listbox
                    slot="dropdown-content"
                    attr-for-selected="item-name"
                    .selected=${stateObj.attributes.fan_mode}
                    @selected-changed=${this._handleFanmodeChanged}
                  >
                    ${stateObj.attributes.fan_modes!.map(
                      (mode) => html`
                        <paper-item item-name=${mode}>
                          ${hass.localize(
                            `state_attributes.climate.fan_mode.${mode}`
                          ) || mode}
                        </paper-item>
                      `
                    )}
                  </paper-listbox>
                </ha-paper-dropdown-menu>
              </div>
            `
          : ""}
        ${supportSwingMode
          ? html`
              <div class="container-swing_list">
                <ha-paper-dropdown-menu
                  label-float
                  dynamic-align
                  .label=${hass.localize("ui.card.climate.swing_mode")}
                >
                  <paper-listbox
                    slot="dropdown-content"
                    attr-for-selected="item-name"
                    .selected=${stateObj.attributes.swing_mode}
                    @selected-changed=${this._handleSwingmodeChanged}
                  >
                    ${stateObj.attributes.swing_modes!.map(
                      (mode) => html`
                        <paper-item item-name=${mode}>${mode}</paper-item>
                      `
                    )}
                  </paper-listbox>
                </ha-paper-dropdown-menu>
              </div>
            `
          : ""}
        ${supportAuxHeat
          ? html`
              <div class="container-aux_heat">
                <div class="center horizontal layout single-row">
                  <div class="flex">
                    ${hass.localize("ui.card.climate.aux_heat")}
                  </div>
                  <ha-switch
                    .checked=${stateObj.attributes.aux_heat === "on"}
                    @change=${this._auxToggleChanged}
                  ></ha-switch>
                </div>
              </div>
            `
          : ""}
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (!changedProps.has("stateObj") || !this.stateObj) {
      return;
    }

    if (this._resizeDebounce) {
      clearTimeout(this._resizeDebounce);
    }
    this._resizeDebounce = window.setTimeout(() => {
      fireEvent(this, "iron-resize");
      this._resizeDebounce = undefined;
    }, 500);
  }

  private _targetTemperatureChanged(ev) {
    const newVal = ev.target.value;
    this._callServiceHelper(
      this.stateObj!.attributes.temperature,
      newVal,
      "set_temperature",
      { temperature: newVal }
    );
  }

  private _targetTemperatureLowChanged(ev) {
    const newVal = ev.currentTarget.value;
    this._callServiceHelper(
      this.stateObj!.attributes.target_temp_low,
      newVal,
      "set_temperature",
      {
        target_temp_low: newVal,
        target_temp_high: this.stateObj!.attributes.target_temp_high,
      }
    );
  }

  private _targetTemperatureHighChanged(ev) {
    const newVal = ev.currentTarget.value;
    this._callServiceHelper(
      this.stateObj!.attributes.target_temp_high,
      newVal,
      "set_temperature",
      {
        target_temp_low: this.stateObj!.attributes.target_temp_low,
        target_temp_high: newVal,
      }
    );
  }

  private _targetHumiditySliderChanged(ev) {
    const newVal = ev.target.value;
    this._callServiceHelper(
      this.stateObj!.attributes.humidity,
      newVal,
      "set_humidity",
      { humidity: newVal }
    );
  }

  private _auxToggleChanged(ev) {
    const newVal = ev.target.checked;
    this._callServiceHelper(
      this.stateObj!.attributes.aux_heat === "on",
      newVal,
      "set_aux_heat",
      { aux_heat: newVal }
    );
  }

  private _handleFanmodeChanged(ev) {
    const newVal = ev.detail.value;
    this._callServiceHelper(
      this.stateObj!.attributes.fan_mode,
      newVal,
      "set_fan_mode",
      { fan_mode: newVal }
    );
  }

  private _handleOperationmodeChanged(ev) {
    const newVal = ev.detail.value;
    this._callServiceHelper(this.stateObj!.state, newVal, "set_hvac_mode", {
      hvac_mode: newVal,
    });
  }

  private _handleSwingmodeChanged(ev) {
    const newVal = ev.detail.value;
    this._callServiceHelper(
      this.stateObj!.attributes.swing_mode,
      newVal,
      "set_swing_mode",
      { swing_mode: newVal }
    );
  }

  private _handlePresetmodeChanged(ev) {
    const newVal = ev.detail.value || null;
    this._callServiceHelper(
      this.stateObj!.attributes.preset_mode,
      newVal,
      "set_preset_mode",
      { preset_mode: newVal }
    );
  }

  private async _callServiceHelper(
    oldVal: unknown,
    newVal: unknown,
    service: string,
    data: {
      entity_id?: string;
      [key: string]: unknown;
    }
  ) {
    if (oldVal === newVal) {
      return;
    }

    data.entity_id = this.stateObj!.entity_id;
    const curState = this.stateObj;

    await this.hass.callService("climate", service, data);

    // We reset stateObj to re-sync the inputs with the state. It will be out
    // of sync if our service call did not result in the entity to be turned
    // on. Since the state is not changing, the resync is not called automatic.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // No need to resync if we received a new state.
    if (this.stateObj !== curState) {
      return;
    }

    this.stateObj = undefined;
    await this.updateComplete;
    // Only restore if not set yet by a state change
    if (this.stateObj === undefined) {
      this.stateObj = curState;
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        color: var(--primary-text-color);
      }

      .container-hvac_modes iron-icon,
      .container-fan_list iron-icon,
      .container-swing_list iron-icon {
        margin: 22px 16px 0 0;
      }

      ha-paper-dropdown-menu {
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
        direction: ltr;
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
    `;
  }
}

customElements.define("more-info-climate", MoreInfoClimate);
