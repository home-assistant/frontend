import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import "@polymer/paper-icon-button/paper-icon-button";

import "../../../components/ha-card";
import "../../../components/ha-icon";

import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";
import computeStateName from "../../../common/entity/compute_state_name";

import { hasConfigOrEntityChanged } from "../common/has-changed";
import { HomeAssistant, ClimateEntity } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { loadRoundslider } from "../../../resources/jquery.roundslider.ondemand";
import { UNIT_F } from "../../../common/const";
import { fireEvent } from "../../../common/dom/fire_event";

const thermostatConfig = {
  radius: 150,
  circleShape: "pie",
  startAngle: 315,
  width: 5,
  lineCap: "round",
  handleSize: "+10",
  showTooltip: false,
  animation: false,
};

const modeIcons = {
  auto: "hass:autorenew",
  manual: "hass:cursor-pointer",
  heat: "hass:fire",
  cool: "hass:snowflake",
  off: "hass:power",
  fan_only: "hass:fan",
  eco: "hass:leaf",
  dry: "hass:water-percent",
  idle: "hass:power-sleep",
};

export interface Config extends LovelaceCardConfig {
  entity: string;
  theme?: string;
  name?: string;
}

export class HuiThermostatCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-thermostat-card-editor" */ "../editor/config-elements/hui-thermostat-card-editor");
    return document.createElement("hui-thermostat-card-editor");
  }

  public static getStubConfig(): object {
    return { entity: "" };
  }

  public hass?: HomeAssistant;
  private _config?: Config;
  private _roundSliderStyle?: TemplateResult;
  private _jQuery?: any;
  private _broadCard?: boolean;
  private _loaded?: boolean;
  private _updated?: boolean;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
      roundSliderStyle: {},
      _jQuery: {},
    };
  }

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: Config): void {
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
        ${this.renderStyle()}
        <ha-card>
          <div class="not-found">
            Entity not available: ${this._config.entity}
          </div>
        </ha-card>
      `;
    }
    const mode = modeIcons[stateObj.attributes.operation_mode || ""]
      ? stateObj.attributes.operation_mode!
      : "unknown-mode";
    return html`
      ${this.renderStyle()}
      <ha-card
        class="${classMap({
          [mode]: true,
          large: this._broadCard!,
          small: !this._broadCard,
        })}">
        <div id="root">
          <paper-icon-button
            icon="hass:dots-vertical"
            class="more-info"
            @click="${this._handleMoreInfo}"
          ></paper-icon-button>
          <div id="thermostat"></div>
          <div id="tooltip">
            <div class="title">${this._config.name ||
              computeStateName(stateObj)}</div>
            <div class="current-temperature">
              <span class="current-temperature-text">
                ${stateObj.attributes.current_temperature}
                ${
                  stateObj.attributes.current_temperature
                    ? html`
                        <span class="uom"
                          >${this.hass.config.unit_system.temperature}</span
                        >
                      `
                    : ""
                }
              </span>
            </div>
            <div class="climate-info">
            <div id="set-temperature"></div>
            <div class="current-mode">${this.hass!.localize(
              `state.climate.${stateObj.state}`
            )}</div>
            <div class="modes">
              ${(stateObj.attributes.operation_list || []).map((modeItem) =>
                this._renderIcon(modeItem, mode)
              )}
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected firstUpdated(): void {
    this._updated = true;
    if (this.isConnected && !this._loaded) {
      this._initialLoad();
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass || !changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (!oldHass || oldHass.themes !== this.hass.themes) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }

    const stateObj = this.hass.states[this._config.entity] as ClimateEntity;

    if (!stateObj) {
      return;
    }

    if (
      this._jQuery &&
      // If jQuery changed, we just rendered in firstUpdated
      !changedProps.has("_jQuery") &&
      (!oldHass || oldHass.states[this._config.entity] !== stateObj)
    ) {
      const [sliderValue, uiValue] = this._genSliderValue(stateObj);

      this._jQuery("#thermostat", this.shadowRoot).roundSlider({
        value: sliderValue,
      });
      this._updateSetTemp(uiValue);
    }
  }

  private get _stepSize(): number {
    const stateObj = this.hass!.states[this._config!.entity];
    if (stateObj.attributes.target_temp_step) {
      return stateObj.attributes.target_temp_step;
    }
    return this.hass!.config.unit_system.temperature === UNIT_F ? 1 : 0.5;
  }

  private async _initialLoad(): Promise<void> {
    this._loaded = true;

    await this.updateComplete;

    let radius = this.clientWidth / 3.2;
    this._broadCard = this.clientWidth > 390;

    if (radius === 0) {
      radius = 100;
    }

    (this.shadowRoot!.querySelector(
      "#thermostat"
    )! as HTMLElement).style.height = radius * 2 + "px";

    const loaded = await loadRoundslider();

    this._roundSliderStyle = loaded.roundSliderStyle;
    this._jQuery = loaded.jQuery;

    const stateObj = this.hass!.states[this._config!.entity] as ClimateEntity;

    const _sliderType =
      stateObj.attributes.target_temp_low &&
      stateObj.attributes.target_temp_high
        ? "range"
        : "min-range";

    const [sliderValue, uiValue] = this._genSliderValue(stateObj);

    this._jQuery("#thermostat", this.shadowRoot).roundSlider({
      ...thermostatConfig,
      radius,
      min: stateObj.attributes.min_temp,
      max: stateObj.attributes.max_temp,
      sliderType: _sliderType,
      change: (value) => this._setTemperature(value),
      drag: (value) => this._dragEvent(value),
      value: sliderValue,
      step: this._stepSize,
    });
    this._updateSetTemp(uiValue);
  }

  private _genSliderValue(stateObj: ClimateEntity): [string | number, string] {
    let sliderValue: string | number;
    let uiValue: string;

    if (
      stateObj.attributes.target_temp_low &&
      stateObj.attributes.target_temp_high
    ) {
      sliderValue = `${stateObj.attributes.target_temp_low}, ${
        stateObj.attributes.target_temp_high
      }`;
      uiValue = this.formatTemp(
        [
          String(stateObj.attributes.target_temp_low),
          String(stateObj.attributes.target_temp_high),
        ],
        false
      );
    } else {
      sliderValue = stateObj.attributes.temperature;
      uiValue =
        stateObj.attributes.temperature !== null
          ? String(stateObj.attributes.temperature)
          : "";
    }

    return [sliderValue, uiValue];
  }

  private _updateSetTemp(value: string): void {
    this.shadowRoot!.querySelector("#set-temperature")!.innerHTML = value;
  }

  private _dragEvent(e): void {
    this._updateSetTemp(this.formatTemp(String(e.value).split(","), true));
  }

  private _setTemperature(e): void {
    const stateObj = this.hass!.states[this._config!.entity] as ClimateEntity;
    if (
      stateObj.attributes.target_temp_low &&
      stateObj.attributes.target_temp_high
    ) {
      if (e.handle.index === 1) {
        this.hass!.callService("climate", "set_temperature", {
          entity_id: this._config!.entity,
          target_temp_low: e.handle.value,
          target_temp_high: stateObj.attributes.target_temp_high,
        });
      } else {
        this.hass!.callService("climate", "set_temperature", {
          entity_id: this._config!.entity,
          target_temp_low: stateObj.attributes.target_temp_low,
          target_temp_high: e.handle.value,
        });
      }
    } else {
      this.hass!.callService("climate", "set_temperature", {
        entity_id: this._config!.entity,
        temperature: e.value,
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
    this.hass!.callService("climate", "set_operation_mode", {
      entity_id: this._config!.entity,
      operation_mode: (e.currentTarget as any).mode,
    });
  }

  private formatTemp(temps: string[], spaceStepSize: boolean): string {
    temps = temps.filter(Boolean);

    // If we are sliding the slider, append 0 to the temperatures if we're
    // having a 0.5 step size, so that the text doesn't jump while sliding
    if (spaceStepSize) {
      const stepSize = this._stepSize;
      temps = temps.map((val) =>
        val.includes(".") || stepSize === 1 ? val : `${val}.0`
      );
    }

    return temps.join("-");
  }

  private renderStyle(): TemplateResult {
    return html`
      ${this._roundSliderStyle}
      <style>
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
        .not-found {
          flex: 1;
          background-color: yellow;
          padding: 8px;
        }
        #root {
          position: relative;
          overflow: hidden;
        }
        .auto {
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
          --thermostat-padding-top: 25px;
          --thermostat-margin-bottom: 25px;
          --title-font-size: 28px;
          --title-position-top: 27%;
          --climate-info-position-top: 81%;
          --set-temperature-font-size: 25px;
          --current-temperature-font-size: 71px;
          --current-temperature-position-top: 10%;
          --current-temperature-text-padding-left: 15px;
          --uom-font-size: 20px;
          --uom-margin-left: -18px;
          --current-mode-font-size: 18px;
          --set-temperature-margin-bottom: -5px;
        }
        .small {
          --thermostat-padding-top: 15px;
          --thermostat-margin-bottom: 15px;
          --title-font-size: 18px;
          --title-position-top: 28%;
          --climate-info-position-top: 79%;
          --set-temperature-font-size: 16px;
          --current-temperature-font-size: 25px;
          --current-temperature-position-top: 5%;
          --current-temperature-text-padding-left: 7px;
          --uom-font-size: 12px;
          --uom-margin-left: -5px;
          --current-mode-font-size: 14px;
          --set-temperature-margin-bottom: 0px;
        }
        #thermostat {
          margin: 0 auto var(--thermostat-margin-bottom);
          padding-top: var(--thermostat-padding-top);
        }
        #thermostat .rs-range-color {
          background-color: var(--mode-color, var(--disabled-text-color));
        }
        #thermostat .rs-path-color {
          background-color: var(--disabled-text-color);
        }
        #thermostat .rs-handle {
          background-color: var(--paper-card-background-color, white);
          padding: 7px;
          border: 2px solid var(--disabled-text-color);
        }
        #thermostat .rs-handle.rs-focus {
          border-color: var(--mode-color, var(--disabled-text-color));
        }
        #thermostat .rs-handle:after {
          border-color: var(--mode-color, var(--disabled-text-color));
          background-color: var(--mode-color, var(--disabled-text-color));
        }
        #thermostat .rs-border {
          border-color: var(--rail-border-color);
        }
        #thermostat .rs-bar.rs-transition.rs-first,
        .rs-bar.rs-transition.rs-second {
          z-index: 20 !important;
        }
        #thermostat .rs-inner.rs-bg-color.rs-border,
        #thermostat .rs-overlay.rs-transition.rs-bg-color {
          background-color: var(--paper-card-background-color, white);
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
        }
        .modes {
          margin-top: 16px;
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
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-thermostat-card": HuiThermostatCard;
  }
}

customElements.define("hui-thermostat-card", HuiThermostatCard);
