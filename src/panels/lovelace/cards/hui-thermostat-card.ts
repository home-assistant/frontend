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
  showTooltip: true,
};

const modeColor = {
  auto: "green",
  heat: "#FF8100",
  cool: "#2b9af9",
  off: "#8a8a8a",
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
  protected hass?: HomeAssistant;
  protected config?: Config;

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
    return html`
      ${this.renderStyle()}
      <ha-card>
        <div
          .hass="${this.hass}"
          .config="${this.config}"
          .localize="${this.localize}"
          id="thermostat"
        ></div>
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
      min: stateObj.attributes.min_temp,
      max: stateObj.attributes.max_temp,
      step: thermostatConfig.step,
      circleShape: thermostatConfig.circleShape,
      sliderType: thermostatConfig.sliderType,
      startAngle: thermostatConfig.startAngle,
      width: thermostatConfig.width,
      handleSize: thermostatConfig.handleSize,
      lineCap: thermostatConfig.lineCap,
      showTooltip: thermostatConfig.showTooltip,
      editableTooltip: false,
      tooltipFormat: this.tooltip.bind(this),
      change: this.setTemperature.bind(this),
    });
  }

  protected updated(changedProps) {
    const stateObj = this.hass!.states[this.config!.entity];

    $("#thermostat", this.shadowRoot).roundSlider({
      value: stateObj.attributes.temperature,
    });
  }

  private renderStyle() {
    const stateObj = this.hass!.states[this.config!.entity];

    return html`
    <style>${roundSliderStyle}</style>
    <style>
      ha-card {
        overflow: hidden;
      }
      .modes {
        display: inline-flex;
      }
      .title {
        font-size: 28px;
        padding-bottom: 40px;
      }
      .climate-info {
        position: absolute;
        left: 50%;
        transform: translate(-50%,0);
        z-index: 5;
        text-align: center;
      }
      .modes ha-icon {
        color: var(--disabled-text-color);
        cursor: pointer;
        display: inline-block;
        margin: 0 10px;
      }
      .auto {
        color: green !important;
      }
      .cool {
        color: #2b9af9 !important;
      }
      .heat {
        color: #FF8100 !important;
      }
      .off {
        color: #8a8a8a !important;
      }
      #thermostat {
        margin: 0 auto;
        padding-top: 25px;
      }
      #thermostat .rs-range-color  {
        background-color: ${modeColor[stateObj.attributes.operation_mode]};
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
          border-color: ${modeColor[stateObj.attributes.operation_mode]};
      }
      #thermostat .rs-handle:after  {
          border-color: ${modeColor[stateObj.attributes.operation_mode]};
          background-color: ${modeColor[stateObj.attributes.operation_mode]};
      }
      #thermostat .rs-border  {
          border-color: transparent;
      }
      #set-temperature {
        font-size: 25px;
        padding-bottom: 5px;
      }
      .current-temperature {
        margin-top: 18px;
        margin-bottom: 50px;
      }
      .current-temperature-text {
        padding-left: 15px;
      }
      .uom {
        font-size: 20px;
        vertical-align: top;
      }
      .current-mode {
        font-size: 17px;
        color: var(--secondary-text-color);
      }
      .rs-tooltip {
        color: var(--primary-text-color);
      }
      .full .rs-tooltip {
        top: 45%;
        left: 50%;
      }
      .rs-tooltip-text {
        font-size: 71px;
        border-radius: 7px;
        text-align: center;
      }
    </style>
    `;
    // TODO: Need to create a dynamic way of styling rs-range-color as well as dynamic text sizing (Use resizeObserver)
    // TODO: Localize to verbage Auto, Heating Cooling etc when not idling
  }

  private tooltip(e) {
    const stateObj = this.hass!.states[this.config!.entity];
    return `<div class="title">Upstairs</div>
      <div class="current-temperature"><span class="current-temperature-text">${
        stateObj.attributes.current_temperature
      }</span><span class="uom">&deg;F</span></div>
      <div class="climate-info">
      <div id="set-temperature">${e.value}</div>
      <div class="current-mode">${this.localize(
        `state.climate.${stateObj.state}`
      )}</div>
      <div class="modes">
        ${stateObj.attributes.operation_list
          .map((mode) =>
            this.renderIcon(mode, stateObj.attributes.operation_mode)
          )
          .join("")}
      </div>
    </div>`; // TODO: Need to localize Unit of Measurement
  }

  private setTemperature(e) {
    this.hass!.callService("climate", "set_temperature", {
      entity_id: this.config!.entity,
      temperature: e.value,
    });
  }

  // ClassMap not working nor .icon
  private renderIcon(mode, currentMode) {
    return `<ha-icon
      class="${currentMode === mode ? mode : ""}"
      id="${mode}"
      @click="${this._handleModeClick}"
      .icon="${modeIcons[mode]}"
    ></ha-icon>`;
    // class="${classMap({ mode: currentMode === mode })}"
  }

  // TODO: Need to find out why this isn't working
  private _handleModeClick(e: MouseEvent) {
    this.hass!.callService("climate", "set_operation_mode", {
      entity_id: this.config.entity,
      mode: e.currentTarget!.id,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-thermostat-card": HuiThermostatCard;
  }
}

customElements.define("hui-thermostat-card", HuiThermostatCard);
