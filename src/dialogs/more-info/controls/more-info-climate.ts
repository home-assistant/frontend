import {
  mdiArrowOscillating,
  mdiFan,
  mdiThermometer,
  mdiTuneVariant,
  mdiWaterPercent,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-icon-button-group";
import "../../../components/ha-icon-button-toggle";
import "../../../components/ha-list-item";
import "../../../components/ha-select";
import "../../../components/ha-switch";
import type { ClimateEntity } from "../../../data/climate";
import {
  ClimateEntityFeature,
  climateHvacModeIcon,
  compareClimateHvacModes,
} from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import "../../../state-control/climate/ha-state-control-climate-humidity";
import "../../../state-control/climate/ha-state-control-climate-temperature";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-control-select-container";
import { moreInfoControlStyle } from "../components/more-info-control-style";

type MainControl = "temperature" | "humidity";

class MoreInfoClimate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ClimateEntity;

  @state() private _mainControl: MainControl = "temperature";

  protected willUpdate(changedProps: PropertyValues): void {
    if (
      changedProps.has("stateObj") &&
      this.stateObj &&
      this._mainControl === "humidity" &&
      !supportsFeature(this.stateObj, ClimateEntityFeature.TARGET_HUMIDITY)
    ) {
      this._mainControl = "temperature";
    }
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const stateObj = this.stateObj;

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
    const supportSwingHorizontalMode = supportsFeature(
      stateObj,
      ClimateEntityFeature.SWING_HORIZONTAL_MODE
    );

    const currentTemperature = this.stateObj.attributes.current_temperature;
    const currentHumidity = this.stateObj.attributes.current_humidity;

    return html`
      <div class="current">
        ${currentTemperature != null
          ? html`
              <div>
                <p class="label">
                  ${this.hass.formatEntityAttributeName(
                    this.stateObj,
                    "current_temperature"
                  )}
                </p>
                <p class="value">
                  ${this.hass.formatEntityAttributeValue(
                    this.stateObj,
                    "current_temperature"
                  )}
                </p>
              </div>
            `
          : nothing}
        ${currentHumidity != null
          ? html`
              <div>
                <p class="label">
                  ${this.hass.formatEntityAttributeName(
                    this.stateObj,
                    "current_humidity"
                  )}
                </p>
                <p class="value">
                  ${this.hass.formatEntityAttributeValue(
                    this.stateObj,
                    "current_humidity"
                  )}
                </p>
              </div>
            `
          : nothing}
      </div>
      <div class="controls">
        ${this._mainControl === "temperature"
          ? html`
              <ha-state-control-climate-temperature
                .hass=${this.hass}
                .stateObj=${this.stateObj}
              ></ha-state-control-climate-temperature>
            `
          : nothing}
        ${this._mainControl === "humidity"
          ? html`
              <ha-state-control-climate-humidity
                .hass=${this.hass}
                .stateObj=${this.stateObj}
              ></ha-state-control-climate-humidity>
            `
          : nothing}
        ${supportTargetHumidity
          ? html`
              <ha-icon-button-group>
                <ha-icon-button-toggle
                  .selected=${this._mainControl === "temperature"}
                  .disabled=${this.stateObj!.state === UNAVAILABLE}
                  .label=${this.hass.localize(
                    "ui.dialogs.more_info_control.climate.temperature"
                  )}
                  .control=${"temperature"}
                  @click=${this._setMainControl}
                >
                  <ha-svg-icon .path=${mdiThermometer}></ha-svg-icon>
                </ha-icon-button-toggle>
                <ha-icon-button-toggle
                  .selected=${this._mainControl === "humidity"}
                  .disabled=${this.stateObj!.state === UNAVAILABLE}
                  .label=${this.hass.localize(
                    "ui.dialogs.more_info_control.climate.humidity"
                  )}
                  .control=${"humidity"}
                  @click=${this._setMainControl}
                >
                  <ha-svg-icon .path=${mdiWaterPercent}></ha-svg-icon>
                </ha-icon-button-toggle>
              </ha-icon-button-group>
            `
          : nothing}
      </div>
      <ha-more-info-control-select-container>
        <ha-control-select-menu
          .label=${this.hass.localize("ui.card.climate.mode")}
          .value=${stateObj.state}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          fixedMenuPosition
          naturalMenuWidth
          @selected=${this._handleOperationModeChanged}
          @closed=${stopPropagation}
        >
          ${html`
            <ha-svg-icon
              slot="icon"
              .path=${climateHvacModeIcon(stateObj.state)}
            ></ha-svg-icon>
          `}
          ${stateObj.attributes.hvac_modes
            .concat()
            .sort(compareClimateHvacModes)
            .map(
              (mode) => html`
                <ha-list-item .value=${mode} graphic="icon">
                  <ha-svg-icon
                    slot="graphic"
                    .path=${climateHvacModeIcon(mode)}
                  ></ha-svg-icon>
                  ${this.hass.formatEntityState(stateObj, mode)}
                </ha-list-item>
              `
            )}
        </ha-control-select-menu>
        ${supportPresetMode && stateObj.attributes.preset_modes
          ? html`
              <ha-control-select-menu
                .label=${this.hass.formatEntityAttributeName(
                  stateObj,
                  "preset_mode"
                )}
                .value=${stateObj.attributes.preset_mode}
                .disabled=${this.stateObj.state === UNAVAILABLE}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handlePresetmodeChanged}
                @closed=${stopPropagation}
              >
                ${stateObj.attributes.preset_mode
                  ? html`
                      <ha-attribute-icon
                        slot="icon"
                        .hass=${this.hass}
                        .stateObj=${stateObj}
                        attribute="preset_mode"
                        .attributeValue=${stateObj.attributes.preset_mode}
                      ></ha-attribute-icon>
                    `
                  : html`
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiTuneVariant}
                      ></ha-svg-icon>
                    `}
                ${stateObj.attributes.preset_modes!.map(
                  (mode) => html`
                    <ha-list-item .value=${mode} graphic="icon">
                      <ha-attribute-icon
                        slot="graphic"
                        .hass=${this.hass}
                        .stateObj=${stateObj}
                        attribute="preset_mode"
                        .attributeValue=${mode}
                      ></ha-attribute-icon>
                      ${this.hass.formatEntityAttributeValue(
                        stateObj,
                        "preset_mode",
                        mode
                      )}
                    </ha-list-item>
                  `
                )}
              </ha-control-select-menu>
            `
          : nothing}
        ${supportFanMode && stateObj.attributes.fan_modes
          ? html`
              <ha-control-select-menu
                .label=${this.hass.formatEntityAttributeName(
                  stateObj,
                  "fan_mode"
                )}
                .value=${stateObj.attributes.fan_mode}
                .disabled=${this.stateObj.state === UNAVAILABLE}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleFanModeChanged}
                @closed=${stopPropagation}
              >
                ${stateObj.attributes.fan_mode
                  ? html`
                      <ha-attribute-icon
                        slot="icon"
                        .hass=${this.hass}
                        .stateObj=${stateObj}
                        attribute="fan_mode"
                        .attributeValue=${stateObj.attributes.fan_mode}
                      ></ha-attribute-icon>
                    `
                  : html`
                      <ha-svg-icon slot="icon" .path=${mdiFan}></ha-svg-icon>
                    `}
                ${stateObj.attributes.fan_modes!.map(
                  (mode) => html`
                    <ha-list-item .value=${mode} graphic="icon">
                      <ha-attribute-icon
                        slot="graphic"
                        .hass=${this.hass}
                        .stateObj=${stateObj}
                        attribute="fan_mode"
                        .attributeValue=${mode}
                      ></ha-attribute-icon>
                      ${this.hass.formatEntityAttributeValue(
                        stateObj,
                        "fan_mode",
                        mode
                      )}
                    </ha-list-item>
                  `
                )}
              </ha-control-select-menu>
            `
          : nothing}
        ${supportSwingMode && stateObj.attributes.swing_modes
          ? html`
              <ha-control-select-menu
                .label=${this.hass.formatEntityAttributeName(
                  stateObj,
                  "swing_mode"
                )}
                .value=${stateObj.attributes.swing_mode}
                .disabled=${this.stateObj.state === UNAVAILABLE}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleSwingmodeChanged}
                @closed=${stopPropagation}
              >
                ${stateObj.attributes.swing_mode
                  ? html`
                      <ha-attribute-icon
                        slot="icon"
                        .hass=${this.hass}
                        .stateObj=${stateObj}
                        attribute="swing_mode"
                        .attributeValue=${stateObj.attributes.swing_mode}
                      ></ha-attribute-icon>
                    `
                  : html`
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiArrowOscillating}
                      ></ha-svg-icon>
                    `}
                ${stateObj.attributes.swing_modes!.map(
                  (mode) => html`
                    <ha-list-item .value=${mode} graphic="icon">
                      <ha-attribute-icon
                        slot="graphic"
                        .hass=${this.hass}
                        .stateObj=${stateObj}
                        attribute="swing_mode"
                        .attributeValue=${mode}
                      ></ha-attribute-icon>
                      ${this.hass.formatEntityAttributeValue(
                        stateObj,
                        "swing_mode",
                        mode
                      )}
                    </ha-list-item>
                  `
                )}
              </ha-control-select-menu>
            `
          : nothing}
        ${supportSwingHorizontalMode &&
        stateObj.attributes.swing_horizontal_modes
          ? html`
              <ha-control-select-menu
                .label=${this.hass.formatEntityAttributeName(
                  stateObj,
                  "swing_horizontal_mode"
                )}
                .value=${stateObj.attributes.swing_horizontal_mode}
                .disabled=${this.stateObj.state === UNAVAILABLE}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleSwingHorizontalmodeChanged}
                @closed=${stopPropagation}
              >
                ${stateObj.attributes.swing_horizontal_mode
                  ? html`
                      <ha-attribute-icon
                        slot="icon"
                        .hass=${this.hass}
                        .stateObj=${stateObj}
                        attribute="swing_horizontal_mode"
                        .attributeValue=${stateObj.attributes
                          .swing_horizontal_mode}
                      ></ha-attribute-icon>
                    `
                  : html`
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiArrowOscillating}
                      ></ha-svg-icon>
                    `}
                ${stateObj.attributes.swing_horizontal_modes!.map(
                  (mode) => html`
                    <ha-list-item .value=${mode} graphic="icon">
                      <ha-attribute-icon
                        slot="graphic"
                        .hass=${this.hass}
                        .stateObj=${stateObj}
                        attribute="swing_horizontal_mode"
                        .attributeValue=${mode}
                      ></ha-attribute-icon>
                      ${this.hass.formatEntityAttributeValue(
                        stateObj,
                        "swing_horizontal_mode",
                        mode
                      )}
                    </ha-list-item>
                  `
                )}
              </ha-control-select-menu>
            `
          : nothing}
      </ha-more-info-control-select-container>
    `;
  }

  private _setMainControl(ev: any) {
    ev.stopPropagation();
    this._mainControl = ev.currentTarget.control;
  }

  private _handleFanModeChanged(ev) {
    const newVal = ev.target.value;
    this._callServiceHelper(
      this.stateObj!.attributes.fan_mode,
      newVal,
      "set_fan_mode",
      { fan_mode: newVal }
    );
  }

  private _handleOperationModeChanged(ev) {
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

  private _handleSwingHorizontalmodeChanged(ev) {
    const newVal = ev.target.value;
    this._callServiceHelper(
      this.stateObj!.attributes.swing_horizontal_mode,
      newVal,
      "set_swing_horizontal_mode",
      { swing_horizontal_mode: newVal }
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

        .current {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          text-align: center;
          margin-bottom: 40px;
        }

        .current div {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          flex: 1;
        }

        .current p {
          margin: 0;
          text-align: center;
          color: var(--primary-text-color);
        }

        .current .label {
          opacity: 0.8;
          font-size: var(--ha-font-size-m);
          line-height: var(--ha-line-height-condensed);
          letter-spacing: 0.4px;
          margin-bottom: 4px;
        }

        .current .value {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
          direction: ltr;
        }
        ha-select {
          width: 100%;
          margin-top: 8px;
        }

        .container-humidity .single-row {
          display: flex;
          height: 50px;
        }

        .target-humidity {
          width: 90px;
          font-size: var(--ha-font-size-3xl);
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
