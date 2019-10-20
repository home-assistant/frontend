import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import "@polymer/paper-icon-button/paper-icon-button";
import "@thomasloven/round-slider";

import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../components/hui-warning";

import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeStateName } from "../../../common/entity/compute_state_name";

import { hasConfigOrEntityChanged } from "../common/has-changed";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { UNIT_F } from "../../../common/const";
import { fireEvent } from "../../../common/dom/fire_event";
import { ThermostatCardConfig } from "./types";
import {
  ClimateEntity,
  HvacMode,
  compareClimateHvacModes,
  CLIMATE_PRESET_NONE,
} from "../../../data/climate";
import { HassEntity } from "home-assistant-js-websocket";

const modeIcons: { [mode in HvacMode]: string } = {
  auto: "hass:calendar-repeat",
  heat_cool: "hass:autorenew",
  heat: "hass:fire",
  cool: "hass:snowflake",
  off: "hass:power",
  fan_only: "hass:fan",
  dry: "hass:water-percent",
};

@customElement("hui-thermostat-card")
export class HuiThermostatCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-thermostat-card-editor" */ "../editor/config-elements/hui-thermostat-card-editor");
    return document.createElement("hui-thermostat-card-editor");
  }

  public static getStubConfig(): object {
    return { entity: "" };
  }

  @property() public hass?: HomeAssistant;
  @property() private _config?: ThermostatCardConfig;
  @property() private _loaded?: boolean;
  @property() private _setTemp?: number | number[];

  private _updated?: boolean;
  private _large?: boolean;
  private _medium?: boolean;
  private _small?: boolean;
  private _radius?: number;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: ThermostatCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "climate") {
      throw new Error("Specify an entity from within the climate domain.");
    }

    this._config = { theme: "default", ...config };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this._updated && !this._loaded) {
      this._initialLoad();
    }
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }
    const stateObj = this.hass.states[this._config.entity] as ClimateEntity;

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    const mode = stateObj.state in modeIcons ? stateObj.state : "unknown-mode";
    const name =
      this._config!.name ||
      computeStateName(this.hass!.states[this._config!.entity]);

    if (!this._radius || this._radius === 0) {
      this._radius = 100;
    }

    return html`
      <ha-card
        class=${classMap({
          [mode]: true,
          large: this._large!,
          medium: this._medium!,
          small: this._small!,
          longName: name.length > 10,
        })}
      >
        <div id="root">
          <paper-icon-button
            icon="hass:dots-vertical"
            class="more-info"
            @click=${this._handleMoreInfo}
          ></paper-icon-button>
          <div id="thermostat">
            ${stateObj.state === "unavailable"
              ? html`
                  <round-slider
                    .radius=${this._radius}
                    disabled="true"
                  ></round-slider>
                `
              : stateObj.attributes.target_temp_low &&
                stateObj.attributes.target_temp_high
              ? html`
                  <round-slider
                    .radius=${this._radius}
                    .low=${stateObj.attributes.target_temp_low}
                    .high=${stateObj.attributes.target_temp_high}
                    .min=${stateObj.attributes.min_temp}
                    .max=${stateObj.attributes.max_temp}
                    .step=${this._stepSize}
                    @value-changing=${this._dragEvent}
                    @value-changed=${this._setTemperature}
                  ></round-slider>
                `
              : html`
                  <round-slider
                    .radius=${this._radius}
                    .value=${stateObj.attributes.temperature !== null &&
                    Number.isFinite(Number(stateObj.attributes.temperature))
                      ? stateObj.attributes.temperature
                      : stateObj.attributes.min_temp}
                    .step=${this._stepSize}
                    .min=${stateObj.attributes.min_temp}
                    .max=${stateObj.attributes.max_temp}
                    @value-changing=${this._dragEvent}
                    @value-changed=${this._setTemperature}
                  ></round-slider>
                `}
          </div>
          <div id="tooltip">
            <div class="title">${name}</div>
            <div class="current-temperature">
              <span class="current-temperature-text">
                ${stateObj.attributes.current_temperature}
                ${stateObj.attributes.current_temperature
                  ? html`
                      <span class="uom"
                        >${this.hass.config.unit_system.temperature}</span
                      >
                    `
                  : ""}
              </span>
            </div>
            <div class="climate-info">
              <div id="set-temperature">
                ${!this._setTemp
                  ? ""
                  : Array.isArray(this._setTemp)
                  ? html`
                      ${this._setTemp[0].toFixed(1)} -
                      ${this._setTemp[1].toFixed(1)}
                    `
                  : html`
                      ${this._setTemp.toFixed(1)}
                    `}
              </div>
              <div class="current-mode">
                ${stateObj.attributes.hvac_action
                  ? this.hass!.localize(
                      `state_attributes.climate.hvac_action.${
                        stateObj.attributes.hvac_action
                      }`
                    )
                  : this.hass!.localize(`state.climate.${stateObj.state}`)}
                ${stateObj.attributes.preset_mode &&
                stateObj.attributes.preset_mode !== CLIMATE_PRESET_NONE
                  ? html`
                      -
                      ${this.hass!.localize(
                        `state_attributes.climate.preset_mode.${
                          stateObj.attributes.preset_mode
                        }`
                      ) || stateObj.attributes.preset_mode}
                    `
                  : ""}
              </div>
              <div class="modes">
                ${(stateObj.attributes.hvac_modes || [])
                  .concat()
                  .sort(compareClimateHvacModes)
                  .map((modeItem) => this._renderIcon(modeItem, mode))}
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass || !changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | ThermostatCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }

    this._setTemp = this._getSetTemp(this.hass!.states[this._config!.entity]);
  }

  protected firstUpdated(): void {
    this._updated = true;
    if (this.isConnected && !this._loaded) {
      this._initialLoad();
    }
  }

  private async _initialLoad(): Promise<void> {
    this._large = this._medium = this._small = false;
    this._radius = this.clientWidth / 3.9;

    if (this.clientWidth > 450) {
      this._large = true;
    } else if (this.clientWidth < 350) {
      this._small = true;
    } else {
      this._medium = true;
    }

    this._loaded = true;
  }

  private get _stepSize(): number {
    const stateObj = this.hass!.states[this._config!.entity] as ClimateEntity;

    if (stateObj.attributes.target_temp_step) {
      return stateObj.attributes.target_temp_step;
    }
    return this.hass!.config.unit_system.temperature === UNIT_F ? 1 : 0.5;
  }

  private _getSetTemp(stateObj: HassEntity) {
    if (stateObj.state === "unavailable") {
      return this.hass!.localize("state.default.unavailable");
    }

    if (
      stateObj.attributes.target_temp_low &&
      stateObj.attributes.target_temp_high
    ) {
      return [
        stateObj.attributes.target_temp_low,
        stateObj.attributes.target_temp_high,
      ];
    }

    return stateObj.attributes.temperature;
  }

  private _dragEvent(e): void {
    const stateObj = this.hass!.states[this._config!.entity] as ClimateEntity;

    if (e.detail.low) {
      this._setTemp = [e.detail.low, stateObj.attributes.target_temp_high];
    } else if (e.detail.high) {
      this._setTemp = [stateObj.attributes.target_temp_low, e.detail.high];
    } else {
      this._setTemp = e.detail.value;
    }
  }

  private _setTemperature(e): void {
    const stateObj = this.hass!.states[this._config!.entity] as ClimateEntity;

    if (e.detail.low) {
      this.hass!.callService("climate", "set_temperature", {
        entity_id: this._config!.entity,
        target_temp_low: e.detail.low,
        target_temp_high: stateObj.attributes.target_temp_high,
      });
    } else if (e.detail.high) {
      this.hass!.callService("climate", "set_temperature", {
        entity_id: this._config!.entity,
        target_temp_low: stateObj.attributes.target_temp_low,
        target_temp_high: e.detail.high,
      });
    } else {
      this.hass!.callService("climate", "set_temperature", {
        entity_id: this._config!.entity,
        temperature: e.detail.value,
      });
    }
  }

  private _renderIcon(mode: string, currentMode: string): TemplateResult {
    if (!modeIcons[mode]) {
      return html``;
    }
    return html`
      <ha-icon
        class="${classMap({ "selected-icon": currentMode === mode })}"
        .mode="${mode}"
        .icon="${modeIcons[mode]}"
        @click="${this._handleModeClick}"
      ></ha-icon>
    `;
  }

  private _handleMoreInfo() {
    fireEvent(this, "hass-more-info", {
      entityId: this._config!.entity,
    });
  }

  private _handleModeClick(e: MouseEvent): void {
    this.hass!.callService("climate", "set_hvac_mode", {
      entity_id: this._config!.entity,
      hvac_mode: (e.currentTarget as any).mode,
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
      }
      ha-card {
        overflow: hidden;
        --rail-border-color: transparent;
        --auto-color: green;
        --eco-color: springgreen;
        --cool-color: #2b9af9;
        --heat-color: #ff8100;
        --manual-color: #44739e;
        --off-color: #8a8a8a;
        --fan_only-color: #8a8a8a;
        --dry-color: #efbd07;
        --idle-color: #8a8a8a;
        --unknown-color: #bac;
      }
      #root {
        position: relative;
        overflow: hidden;
      }
      .auto,
      .heat_cool {
        --mode-color: var(--auto-color);
      }
      .cool {
        --mode-color: var(--cool-color);
      }
      .heat {
        --mode-color: var(--heat-color);
      }
      .manual {
        --mode-color: var(--manual-color);
      }
      .off {
        --mode-color: var(--off-color);
      }
      .fan_only {
        --mode-color: var(--fan_only-color);
      }
      .eco {
        --mode-color: var(--eco-color);
      }
      .dry {
        --mode-color: var(--dry-color);
      }
      .idle {
        --mode-color: var(--idle-color);
      }
      .unknown-mode {
        --mode-color: var(--unknown-color);
      }
      .no-title {
        --title-position-top: 33% !important;
      }
      .large {
        --thermostat-padding-top: 32px;
        --thermostat-margin-bottom: 32px;
        --title-font-size: 28px;
        --title-position-top: 25%;
        --climate-info-position-top: 80%;
        --set-temperature-font-size: 25px;
        --current-temperature-font-size: 71px;
        --current-temperature-position-top: 10%;
        --current-temperature-text-padding-left: 15px;
        --uom-font-size: 20px;
        --uom-margin-left: -18px;
        --current-mode-font-size: 18px;
        --current-mod-margin-top: 6px;
        --current-mod-margin-bottom: 12px;
        --set-temperature-margin-bottom: -5px;
      }
      .medium {
        --thermostat-padding-top: 20px;
        --thermostat-margin-bottom: 20px;
        --title-font-size: 23px;
        --title-position-top: 27%;
        --climate-info-position-top: 84%;
        --set-temperature-font-size: 20px;
        --current-temperature-font-size: 65px;
        --current-temperature-position-top: 10%;
        --current-temperature-text-padding-left: 15px;
        --uom-font-size: 18px;
        --uom-margin-left: -16px;
        --current-mode-font-size: 16px;
        --current-mod-margin-top: 4px;
        --current-mod-margin-bottom: 4px;
        --set-temperature-margin-bottom: -5px;
      }
      .small {
        --thermostat-padding-top: 15px;
        --thermostat-margin-bottom: 15px;
        --title-font-size: 18px;
        --title-position-top: 28%;
        --climate-info-position-top: 78%;
        --set-temperature-font-size: 16px;
        --current-temperature-font-size: 55px;
        --current-temperature-position-top: 5%;
        --current-temperature-text-padding-left: 16px;
        --uom-font-size: 16px;
        --uom-margin-left: -14px;
        --current-mode-font-size: 14px;
        --current-mod-margin-top: 2px;
        --current-mod-margin-bottom: 4px;
        --set-temperature-margin-bottom: 0px;
      }
      .longName {
        --title-font-size: 18px;
      }
      #thermostat {
        margin: 0 auto var(--thermostat-margin-bottom);
        padding-top: var(--thermostat-padding-top);
        padding-bottom: 32px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      #thermostat round-slider {
        margin: 0 auto;
        display: inline-block;
        --round-slider-path-color: var(--disabled-text-color);
        --round-slider-bar-color: var(--mode-color);
        z-index: 20;
      }
      #tooltip {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 100%;
        text-align: center;
        z-index: 15;
        color: var(--primary-text-color);
      }
      #set-temperature {
        font-size: var(--set-temperature-font-size);
        margin-bottom: var(--set-temperature-margin-bottom);
        min-height: 1.2em;
      }
      .title {
        font-size: var(--title-font-size);
        position: absolute;
        top: var(--title-position-top);
        left: 50%;
        transform: translate(-50%, -50%);
      }
      .climate-info {
        position: absolute;
        top: var(--climate-info-position-top);
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
      }
      .current-mode {
        font-size: var(--current-mode-font-size);
        color: var(--secondary-text-color);
        margin-top: var(--current-mod-margin-top);
        margin-bottom: var(--current-mod-margin-bottom);
      }
      .modes ha-icon {
        color: var(--disabled-text-color);
        cursor: pointer;
        display: inline-block;
        margin: 0 10px;
      }
      .modes ha-icon.selected-icon {
        color: var(--mode-color);
      }
      .current-temperature {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: var(--current-temperature-font-size);
      }
      .current-temperature-text {
        padding-left: var(--current-temperature-text-padding-left);
      }
      .uom {
        font-size: var(--uom-font-size);
        vertical-align: top;
        margin-left: var(--uom-margin-left);
      }
      .more-info {
        position: absolute;
        cursor: pointer;
        top: 0;
        right: 0;
        z-index: 25;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-thermostat-card": HuiThermostatCard;
  }
}
