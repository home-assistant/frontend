import { html, LitElement } from "@polymer/lit-element";
import roundSliderStyle from "round-slider/dist/roundslider.min.css";

import "../../../components/ha-card.js";
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
  handleShape: "dot",
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

const thermostatState = {
  entity_id: "climate.thermostat",
  state: "cool",
  attributes: {
    current_temperature: 73,
    min_temp: 50,
    max_temp: 90,
    temperature: 70,
    target_temp_high: 75,
    target_temp_low: 65,
    fan_mode: "Auto Low",
    fan_list: ["On Low", "On High", "Auto Low", "Auto High", "Off"],
    operation_mode: "cool",
    operation_list: ["heat", "cool", "auto", "off"],
    hold_mode: "home",
    swing_mode: "Auto",
    swing_list: ["Auto", "1", "2", "3", "Off"],
    unit_of_measurement: "°F",
    friendly_name: "Ecobee",
    supported_features: 1014,
  },
  last_changed: "2018-07-19T10:44:46.200333+00:00",
  last_updated: "2018-07-19T10:44:46.200333+00:00",
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
    const thermostat = { "climate.thermostat": thermostatState };
    this.hass!.states = { ...thermostat, ...this.hass!.states };
    const stateObj = this.hass!.states[this.config!.entity];

    return html`
      ${this.renderStyle()}
      <ha-card>
        <div
          .hass="${this.hass}"
          .config="${this.config}"
          .localize="${this.localize}"
          id="thermostat"
        ></div>
        <div class="climate-info">
          <div id="set-temperature">${stateObj.attributes.temperature}</div>
          <div class="current-mode">${this.localize(
            `state.climate.${stateObj.state}`
          )}ing</div>
          <div class="modes">
            <ha-icon
              class="${
                stateObj.attributes.operation_mode === "auto"
                  ? "selected-icon"
                  : ""
              }"
              entity="${stateObj.entity_id}"
              id="auto"
              @click="${this.handleModeClick}"
              icon="${modeIcons.auto}"
            ></ha-icon>
            <ha-icon
              class="${
                stateObj.attributes.operation_mode === "heat"
                  ? "selected-icon"
                  : ""
              }"
              id="heat"
              @click="${this.handleModeClick}"
              icon="${modeIcons.heat}"></ha-icon>
            <ha-icon
              class="${
                stateObj.attributes.operation_mode === "cool"
                  ? "selected-icon"
                  : ""
              }"
              id="cool"
              @click="${this.handleModeClick}"
              icon="${modeIcons.cool}"></ha-icon>
            <ha-icon
              class="${
                stateObj.attributes.operation_mode === "off"
                  ? "selected-icon"
                  : ""
              }"
              id="off"
              @click="${this.handleModeClick}"
              icon="${modeIcons.off}"></ha-icon>
          </div>
        </div>
      </ha-card>
    `;
  }

  protected updated(changedProperties) {
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
      value: stateObj.attributes.temperature,
      tooltipFormat: this.tooltip.bind(this),
      change: this.setTemperature.bind(this),
    });
  }

  private renderStyle() {
    const stateObj = this.hass!.states[this.config!.entity];

    return html`
    <style>

    ha-card {
      overflow: hidden;
    }

    .modes {
      padding-top: 5px;
    }

    .title {
      font-size: ${Math.round($(this).outerWidth() / 18)}px;
      padding-bottom: 40px;
    }

    .climate-info {
      position: absolute;
      bottom: -3%;
      left: 50%;
      transform: translate(-50%,-50%);
      z-index: 5;
      text-align: center;
    }

    .modes ha-icon {
      color: var(--disabled-text-color);
      cursor: pointer;
      padding: 0 10px;
    }

    .modes .selected-icon {
      color: ${modeColor[stateObj.attributes.operation_mode]};
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
      font-size: ${Math.round($(this).outerWidth() / 20)}px;
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
      font-size: ${Math.round($(this).outerWidth() / 30)}px;
      padding-bottom: 5px;
      color: var(--secondary-text-color);
    }
    #thermostat .full .rs-tooltip {
    }
    </style>
    <style>${roundSliderStyle}</style>
    `;
  }

  private tooltip(e) {
    const stateObj = this.hass!.states[this.config!.entity];
    $("#set-temperature", this.shadowRoot).text(e.value);
    return `<div class="title">Upstairs</div>
      <div class="current-temperature"><span class="current-temperature-text">${
        stateObj.attributes.current_temperature
      }</span><span class="uom">${
      stateObj.attributes.unit_of_measurement
    }</span></div>`;
  }

  private setTemperature(e) {
    this.hass!.callService("climate", "set_temperature", {
      entity_id: this.config!.entity,
      temperature: e.value,
    });
  }

  private renderIcon(mode, stateObj) {
    return html`<ha-icon
      class="${stateObj.current === mode ? mode : ""}"
      .mode="${mode}"
      .entity="${stateObj.entity}"
      @click="${this.handleModeClick}"
      icon="${modeIcons[mode]}"
    ></ha-icon>`;
  }

  private handleModeClick(e: MouseEvent) {
    thermostatState.attributes.operation_mode = e.currentTarget!.id;
    thermostatState.state = e.currentTarget!.id;
    this.hass!.callService("climate", "set_operation_mode", {
      entity_id: e.currentTarget!.entity,
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
