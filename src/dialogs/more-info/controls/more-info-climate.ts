import "@material/mwc-list/mwc-list-item";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import {
  computeAttributeNameDisplay,
  computeAttributeValueDisplay,
} from "../../../common/entity/compute_attribute_display";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import "../../../components/ha-select";
import "../../../components/ha-slider";
import "../../../components/ha-switch";
import {
  ClimateEntity,
  ClimateEntityFeature,
  compareClimateHvacModes,
} from "../../../data/climate";
import { HomeAssistant } from "../../../types";
import "../components/climate/ha-more-info-climate-main";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";

class MoreInfoClimate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: ClimateEntity;

  private _resizeDebounce?: number;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const hass = this.hass;
    const stateObj = this.stateObj;

    const supportTargetTemperature = supportsFeature(
      stateObj,
      ClimateEntityFeature.TARGET_TEMPERATURE
    );
    const supportTargetTemperatureRange = supportsFeature(
      stateObj,
      ClimateEntityFeature.TARGET_TEMPERATURE_RANGE
    );
    const supportTargetHumidity = supportsFeature(
      stateObj,
      ClimateEntityFeature.TARGET_HUMIDITY
    );
    const supportFanMode = supportsFeature(
      stateObj,
      ClimateEntityFeature.FAN_MODE
    );
    const supportPresetMode = supportsFeature(
      stateObj,
      ClimateEntityFeature.PRESET_MODE
    );
    const supportSwingMode = supportsFeature(
      stateObj,
      ClimateEntityFeature.SWING_MODE
    );
    const supportAuxHeat = supportsFeature(
      stateObj,
      ClimateEntityFeature.AUX_HEAT
    );

    const rtlDirection = computeRTLDirection(hass);

    return html`
      <div class="controls">
        <ha-more-info-climate-main
          .hass=${this.hass}
          .stateObj=${this.stateObj}
        ></ha-more-info-climate-main>
      </div>
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
        ${supportTargetHumidity
          ? html`
              <div class="container-humidity">
                <div>
                  ${computeAttributeNameDisplay(
                    hass.localize,
                    stateObj,
                    hass.entities,
                    "humidity"
                  )}
                </div>
                <div class="single-row">
                  <div class="target-humidity">
                    ${stateObj.attributes.humidity} %
                  </div>
                  <ha-slider
                    step="1"
                    pin
                    ignore-bar-touch
                    dir=${rtlDirection}
                    .min=${stateObj.attributes.min_humidity}
                    .max=${stateObj.attributes.max_humidity}
                    .value=${stateObj.attributes.humidity}
                    @change=${this._targetHumiditySliderChanged}
                  >
                  </ha-slider>
                </div>
              </div>
            `
          : ""}

        <div class="container-hvac_modes">
          <ha-select
            .label=${hass.localize("ui.card.climate.operation")}
            .value=${stateObj.state}
            fixedMenuPosition
            naturalMenuWidth
            @selected=${this._handleOperationmodeChanged}
            @closed=${stopPropagation}
          >
            ${stateObj.attributes.hvac_modes
              .concat()
              .sort(compareClimateHvacModes)
              .map(
                (mode) => html`
                  <mwc-list-item .value=${mode}>
                    ${computeStateDisplay(
                      hass.localize,
                      stateObj,
                      hass.locale,
                      this.hass.config,
                      hass.entities,
                      mode
                    )}
                  </mwc-list-item>
                `
              )}
          </ha-select>
        </div>

        ${supportPresetMode && stateObj.attributes.preset_modes
          ? html`
              <div class="container-preset_modes">
                <ha-select
                  .label=${computeAttributeNameDisplay(
                    hass.localize,
                    stateObj,
                    hass.entities,
                    "preset_mode"
                  )}
                  .value=${stateObj.attributes.preset_mode}
                  fixedMenuPosition
                  naturalMenuWidth
                  @selected=${this._handlePresetmodeChanged}
                  @closed=${stopPropagation}
                >
                  ${stateObj.attributes.preset_modes!.map(
                    (mode) => html`
                      <mwc-list-item .value=${mode}>
                        ${computeAttributeValueDisplay(
                          hass.localize,
                          stateObj,
                          hass.locale,
                          hass.config,
                          hass.entities,
                          "preset_mode",
                          mode
                        )}
                      </mwc-list-item>
                    `
                  )}
                </ha-select>
              </div>
            `
          : ""}
        ${supportFanMode && stateObj.attributes.fan_modes
          ? html`
              <div class="container-fan_list">
                <ha-select
                  .label=${computeAttributeNameDisplay(
                    hass.localize,
                    stateObj,
                    hass.entities,
                    "fan_mode"
                  )}
                  .value=${stateObj.attributes.fan_mode}
                  fixedMenuPosition
                  naturalMenuWidth
                  @selected=${this._handleFanmodeChanged}
                  @closed=${stopPropagation}
                >
                  ${stateObj.attributes.fan_modes!.map(
                    (mode) => html`
                      <mwc-list-item .value=${mode}>
                        ${computeAttributeValueDisplay(
                          hass.localize,
                          stateObj,
                          hass.locale,
                          this.hass.config,
                          hass.entities,
                          "fan_mode",
                          mode
                        )}
                      </mwc-list-item>
                    `
                  )}
                </ha-select>
              </div>
            `
          : ""}
        ${supportSwingMode && stateObj.attributes.swing_modes
          ? html`
              <div class="container-swing_list">
                <ha-select
                  .label=${computeAttributeNameDisplay(
                    hass.localize,
                    stateObj,
                    hass.entities,
                    "swing_mode"
                  )}
                  .value=${stateObj.attributes.swing_mode}
                  fixedMenuPosition
                  naturalMenuWidth
                  @selected=${this._handleSwingmodeChanged}
                  @closed=${stopPropagation}
                >
                  ${stateObj.attributes.swing_modes!.map(
                    (mode) => html`
                      <mwc-list-item .value=${mode}>
                        ${computeAttributeValueDisplay(
                          hass.localize,
                          stateObj,
                          hass.locale,
                          this.hass.config,
                          hass.entities,
                          "swing_mode",
                          mode
                        )}
                      </mwc-list-item>
                    `
                  )}
                </ha-select>
              </div>
            `
          : ""}
        ${supportAuxHeat
          ? html`
              <div class="container-aux_heat">
                <div class="center horizontal layout single-row">
                  <div class="flex">
                    ${computeAttributeNameDisplay(
                      hass.localize,
                      stateObj,
                      hass.entities,
                      "aux_heat"
                    )}
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
    const newVal = ev.target.value;
    this._callServiceHelper(
      this.stateObj!.attributes.fan_mode,
      newVal,
      "set_fan_mode",
      { fan_mode: newVal }
    );
  }

  private _handleOperationmodeChanged(ev) {
    const newVal = ev.target.value;
    this._callServiceHelper(this.stateObj!.state, newVal, "set_hvac_mode", {
      hvac_mode: newVal,
    });
  }

  private _handleSwingmodeChanged(ev) {
    const newVal = ev.target.value;
    this._callServiceHelper(
      this.stateObj!.attributes.swing_mode,
      newVal,
      "set_swing_mode",
      { swing_mode: newVal }
    );
  }

  private _handlePresetmodeChanged(ev) {
    const newVal = ev.target.value || null;
    if (newVal) {
      this._callServiceHelper(
        this.stateObj!.attributes.preset_mode,
        newVal,
        "set_preset_mode",
        { preset_mode: newVal }
      );
    }
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
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

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

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        :host {
          color: var(--primary-text-color);
        }

        ha-select {
          width: 100%;
          margin-top: 8px;
        }

        ha-slider {
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

        .single-row {
          padding: 8px 0;
        }
      `,
    ];
  }
}

customElements.define("more-info-climate", MoreInfoClimate);

declare global {
  interface HTMLElementTagNameMap {
    "more-info-climate": MoreInfoClimate;
  }
}
