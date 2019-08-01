import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  customElement,
  property,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import "@polymer/paper-icon-button/paper-icon-button";

import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../components/hui-warning";

import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";
import computeStateName from "../../../common/entity/compute_state_name";

import { hasConfigOrEntityChanged } from "../common/has-changed";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { loadRoundslider } from "../../../resources/jquery.roundslider.ondemand";
import { UNIT_F } from "../../../common/const";
import { fireEvent } from "../../../common/dom/fire_event";
import { ThermostatCardConfig } from "./types";
import {
  ClimateEntity,
  HvacMode,
  compareClimateHvacModes,
  CLIMATE_PRESET_NONE,
} from "../../../data/climate";

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

  @property() private _roundSliderStyle?: TemplateResult;

  @property() private _jQuery?: any;

  private _broadCard?: boolean;

  private _loaded?: boolean;

  private _updated?: boolean;

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
    return html`
      ${this.renderStyle()}
      <ha-card
        class="${classMap({
          [mode]: true,
          large: this._broadCard!,
          small: !this._broadCard,
        })}"
      >
        <div id="root">
          <paper-icon-button
            icon="hass:dots-vertical"
            class="more-info"
            @click="${this._handleMoreInfo}"
          ></paper-icon-button>
          <div id="thermostat"></div>
          <div id="tooltip">
            <div class="title">
              ${this._config.name || computeStateName(stateObj)}
            </div>
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
              <div id="set-temperature"></div>
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
      const [sliderValue, uiValue, sliderType] = this._genSliderValue(stateObj);

      this._jQuery("#thermostat", this.shadowRoot).roundSlider({
        sliderType,
        value: sliderValue,
        disabled: sliderValue === null,
      });
      this._updateSetTemp(uiValue);
    }
  }

  private get _stepSize(): number {
    const stateObj = this.hass!.states[this._config!.entity] as ClimateEntity;

    if (stateObj.attributes.target_temp_step) {
      return stateObj.attributes.target_temp_step;
    }
    return this.hass!.config.unit_system.temperature === UNIT_F ? 1 : 0.5;
  }

  private async _initialLoad(): Promise<void> {
    const stateObj = this.hass!.states[this._config!.entity] as ClimateEntity;

    if (!stateObj) {
      // Card will require refresh to work again
      return;
    }

    this._loaded = true;

    await this.updateComplete;

    let radius = this.clientWidth / 3.2;
    this._broadCard = this.clientWidth > 390;

    if (radius === 0) {
      radius = 100;
    }

    (this.shadowRoot!.querySelector(
      "#thermostat"
    ) as HTMLElement)!.style.height = radius * 2 + "px";

    const loaded = await loadRoundslider();

    this._roundSliderStyle = loaded.roundSliderStyle;
    this._jQuery = loaded.jQuery;

    const [sliderValue, uiValue, sliderType] = this._genSliderValue(stateObj);

    this._jQuery("#thermostat", this.shadowRoot).roundSlider({
      ...thermostatConfig,
      radius,
      min: stateObj.attributes.min_temp,
      max: stateObj.attributes.max_temp,
      sliderType,
      change: (value) => this._setTemperature(value),
      drag: (value) => this._dragEvent(value),
      value: sliderValue,
      disabled: sliderValue === null,
      step: this._stepSize,
    });
    this._updateSetTemp(uiValue);
  }

  private _genSliderValue(
    stateObj: ClimateEntity
  ): [string | number | null, string, string] {
    let sliderType: string;
    let sliderValue: string | number | null;
    let uiValue: string;

    if (stateObj.state === "unavailable") {
      sliderType = "min-range";
      sliderValue = null;
      uiValue = this.hass!.localize("state.default.unavailable");
    } else if (
      stateObj.attributes.target_temp_low &&
      stateObj.attributes.target_temp_high
    ) {
      sliderType = "range";
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
      sliderType = "min-range";
      sliderValue = Number.isFinite(Number(stateObj.attributes.temperature))
        ? stateObj.attributes.temperature
        : null;
      uiValue = sliderValue !== null ? String(sliderValue) : "";
    }

    return [sliderValue, uiValue, sliderType];
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
    this.hass!.callService("climate", "set_hvac_mode", {
      entity_id: this._config!.entity,
      hvac_mode: (e.currentTarget as any).mode,
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
          padding: 10px;
          margin: -10px 0 0 -8px !important;
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
        #thermostat .rs-readonly {
          z-index: 10;
          top: auto;
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
