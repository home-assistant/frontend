import { html, LitElement } from "@polymer/lit-element";
import { classMap } from "lit-html/directives/classMap.js";
import roundSliderStyle from "round-slider/dist/roundslider.min.css";

import "../../../components/ha-card.js";
import "../../../components/ha-icon.js";
import "../../../resources/jquery.roundslider";

import { HomeAssistant } from "../../../types.js";
import { HassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceCard, LovelaceConfig } from "../types.js";

const thermostatConfig = {
  radius: 150,
  min: 50,
  max: 90,
  step: 1,
  circleShape: "pie",
  sliderType: "min-range",
  value: 70,
  startAngle: 315,
  width: 5,
  lineCap: "round",
  handleSize: "+10",
  showTooltip: false,
};

const modeIcons = {
  auto: "mdi:autorenew",
  heat: "hass:fire",
  cool: "hass:snowflake",
  off: "mdi:fan-off",
};

interface Config extends LovelaceConfig {
  entity: string;
}

let loaded: Promise<void>;

export class HuiThermostatCard extends HassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  public hass?: HomeAssistant;
  protected config?: Config;
  protected roundSlider: any;

  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }

  public getCardSize() {
    return 4;
  }

  public setConfig(config: Config) {
    if (!config.entity || config.entity.split(".")[0] !== "climate") {
      throw new Error("Specify an entity from within the climate domain.");
    }

    this.config = config;
  }

  protected render() {
    const stateObj = this.hass!.states[this.config!.entity];
    const sizeClass = this.clientWidth > 450 ? "large" : "small"; // Use Class Map
    return html`
      ${this.renderStyle()}
      <ha-card
        class="${stateObj.attributes.operation_mode} ${sizeClass}">
        <div id="root">
          <div
            .hass="${this.hass}"
            .config="${this.config}"
            .localize="${this.localize}"
            id="thermostat"
          ></div>
          <div id="tooltip">
            <div class="title">Upstairs</div>
            <div class="current-temperature">
              <span class="current-temperature-text">${
                stateObj.attributes.current_temperature
              }</span><span class="uom">&deg;F</span>
            </div>
            <div class="climate-info">
            <div id="set-temperature">${stateObj.attributes.temperature}</div>
            <div class="current-mode">${this.localize(
              `state.climate.${stateObj.state}`
            )}</div>
            <div class="modes">
              ${stateObj.attributes.operation_list.map((modeItem) =>
                this._renderIcon(modeItem, stateObj.attributes.operation_mode)
              )}
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps) {
    if (changedProps.get("hass")) {
      return changedProps.get("hass").states[this.config!.entity] !==
        this.hass!.states[this.config!.entity]
        ? true
        : false;
    }
    return changedProps;
  }

  protected firstUpdated(changedProps) {
    const stateObj = this.hass!.states[this.config!.entity];

    $("#thermostat", this.shadowRoot).roundSlider({
      radius: this.clientWidth / 3,
      min: stateObj.attributes.min_temp || thermostatConfig.min,
      max: stateObj.attributes.max_temp || thermostatConfig.max,
      step: thermostatConfig.step,
      circleShape: thermostatConfig.circleShape,
      sliderType: thermostatConfig.sliderType,
      startAngle: thermostatConfig.startAngle,
      width: thermostatConfig.width,
      handleSize: thermostatConfig.handleSize,
      lineCap: thermostatConfig.lineCap,
      showTooltip: thermostatConfig.showTooltip,
      change: (value) => this._setTemperature(value),
      drag: (value) => this._dragEvent(value),
    });
    this.roundSlider = $("#thermostat", this.shadowRoot).data("roundSlider");
  }

  protected updated(changedProps) {
    const stateObj = this.hass!.states[this.config!.entity];

    this.roundSlider.setValue(stateObj.attributes.temperature);
    this.shadowRoot!.querySelector(".current-mode")!.innerHTML = this.localize(
      `state.climate.${stateObj.state}`
    );
  }

  private renderStyle() {
    return html`
    <style>${roundSliderStyle}</style>
    <style>
      ha-card {
        overflow: hidden;
      }
      #root {
        position: relative;
        overflow: hidden;
      }
      #tooltip {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        text-align: center;
        z-index: 15;
      }
      .title {
        font-size: var(--title-font-size);
        margin-top: var(--title-margin-top);
      }
      .climate-info {
        margin-top: var(--climate-info-margin-top);
      }
      .modes {
        margin-top: var(--modes-margin-top);
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
      .auto {
        --mode-color: green;
      }
      .cool {
        --mode-color: #2b9af9;
      }
      .heat {
        --mode-color: #FF8100;
      }
      .off {
        --mode-color: #8a8a8a;
      }
      .large {
        --thermostat-padding: 25px 0;
        --title-font-size: 28px;
        --title-margin-top: 20%;
        --climate-info-margin-top: 17%;
        --modes-margin-top: 2%;
        --set-temperature-font-size: 25px;
        --current-temperature-font-size: 71px;
        --current-temperature-margin-top: 10%;
        --current-temperature-text-padding-left: 15px;
        --uom-font-size: 20px;
        --current-mode-font-size: 20px;
        --set-temperature-padding-bottom: 5px;
      }
      .small {
        --thermostat-padding: 15px 0;
        --title-font-size: 18px;
        --title-margin-top: 20%;
        --climate-info-margin-top: 7.5%;
        --modes-margin-top: 1%;
        --set-temperature-font-size: 16px;
        --current-temperature-font-size: 25px;
        --current-temperature-margin-top: 5%;
        --current-temperature-text-padding-left: 7px;
        --uom-font-size: 12px;
        --current-mode-font-size: 14px;
        --set-temperature-padding-bottom: 0px;
      }
      #thermostat {
        margin: 0 auto;
        padding: var(--thermostat-padding);
      }
      #thermostat .rs-range-color  {
        background-color: var(--mode-color, var(--disabled-text-color));
      }
      #thermostat .rs-path-color  {
          background-color: #d6d6d6;
      }
      #thermostat .rs-handle  {
          background-color: #FFF;
          padding: 7px;
          border: 2px solid #d6d6d6;
      }
      #thermostat .rs-handle.rs-focus  {
          border-color: var(--mode-color, var(--disabled-text-color));
      }
      #thermostat .rs-handle:after  {
          border-color: var(--mode-color, var(--disabled-text-color));
          background-color: var(--mode-color, var(--disabled-text-color));
      }
      #thermostat .rs-border  {
        border-color: transparent;
      }
      #set-temperature {
        font-size: var(--set-temperature-font-size);
        padding-bottom: var(--set-temperature-padding-bottom);
      }
      .current-temperature {
        margin-top: var(--current-temperature-margin-top);
        font-size: var(--current-temperature-font-size);
      }
      .current-temperature-text {
        padding-left: var(--current-temperature-text-padding-left);
      }
      .uom {
        font-size: var(--uom-font-size);
        vertical-align: top;
      }
      .current-mode {
        font-size: var(--current-mode-font-size);
        color: var(--secondary-text-color);
      }
      .rs-bar.rs-transition.rs-first {
        z-index: 20 !important;
      }
    </style>
    `;
    // TODO: Localize to verbage Auto, Heating Cooling etc when not idling
  }

  private _dragEvent(e) {
    this.shadowRoot!.querySelector("#set-temperature")!.innerHTML = e.value;
  }

  private _setTemperature(e) {
    this.hass!.callService("climate", "set_temperature", {
      entity_id: this.config!.entity,
      temperature: e.value,
    });
  }

  private _renderIcon(mode, currentMode) {
    return html`<ha-icon
      class="${classMap({ "selected-icon": currentMode === mode })}"
      .mode="${mode}"
      .icon="${modeIcons[mode]}"
      @click="${this._handleModeClick}"
    ></ha-icon>`;
  }

  // TODO: Need to find out why this isn't working
  private _handleModeClick(e: MouseEvent) {
    this.hass!.callService("climate", "set_operation_mode", {
      entity_id: this.config!.entity,
      operation_mode: e.currentTarget!.mode,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-thermostat-card": HuiThermostatCard;
  }
}

customElements.define("hui-thermostat-card", HuiThermostatCard);
