import { html, LitElement } from "@polymer/lit-element";

import "../../../components/ha-card.js";
import "jquery";
import "../../../resources/roundslider.js";

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
   .rs-ie,
   .rs-edge {
     -ms-touch-action: none;
     touch-action: none;
   }
   .rs-control {
     position: relative;
     outline: 0 none;
   }
   .rs-container {
     position: relative;
   }
   .rs-control *,
   .rs-control *:before,
   .rs-control *:after {
     -webkit-box-sizing: border-box;
     -moz-box-sizing: border-box;
     box-sizing: border-box;
   }
   .rs-animation .rs-transition {
     -webkit-transition: all 0.5s linear 0s;
     -moz-transition: all 0.5s linear 0s;
     -o-transition: all 0.5s linear 0s;
     transition: all 0.5s linear 0s;
   }
   .rs-bar {
     -webkit-transform-origin: 100% 50%;
     -moz-transform-origin: 100% 50%;
     -ms-transform-origin: 100% 50%;
     -o-transform-origin: 100% 50%;
     transform-origin: 100% 50%;
   }
   .rs-control .rs-split .rs-path,
   .rs-control .rs-overlay1,
   .rs-control .rs-overlay2 {
     -webkit-transform-origin: 50% 100%;
     -moz-transform-origin: 50% 100%;
     -ms-transform-origin: 50% 100%;
     -o-transform-origin: 50% 100%;
     transform-origin: 50% 100%;
   }
   .rs-control .rs-overlay {
     -webkit-transform-origin: 100% 100%;
     -moz-transform-origin: 100% 100%;
     -ms-transform-origin: 100% 100%;
     -o-transform-origin: 100% 100%;
     transform-origin: 100% 100%;
   }
   .rs-rounded .rs-seperator,
   .rs-split .rs-path {
     -webkit-background-clip: padding-box;
     -moz-background-clip: padding;
     background-clip: padding-box;
   }
   .rs-control.rs-error {
     border: 1px dotted;
     text-align: center;
   }
   .rs-readonly {
     height: 100%;
     width: 100%;
     top: 0;
     position: absolute;
     z-index: 100;
   }
   .rs-disabled {
     opacity: 0.35;
   }
   .rs-inner-container {
     height: 100%;
     width: 100%;
     position: relative;
     overflow: hidden;
   }
   .quarter div.rs-block {
     height: 200%;
     width: 200%;
   }
   .half.top div.rs-block,
   .half.bottom div.rs-block {
     height: 200%;
     width: 100%;
   }
   .half.left div.rs-block,
   .half.right div.rs-block {
     height: 100%;
     width: 200%;
   }
   .bottom > .rs-inner-container > .rs-block {
     top: auto;
     bottom: 0;
   }
   .right .rs-inner-container > .rs-block {
     right: 0;
   }
   div.rs-block {
     -webkit-border-radius: 1000px;
     border-radius: 1000px;
   }
   .rs-block {
     height: 100%;
     width: 100%;
     display: block;
     position: absolute;
     top: 0;
     overflow: hidden;
     z-index: 3;
   }
   .rs-block .rs-inner {
     -webkit-border-radius: 1000px;
     border-radius: 1000px;
     display: block;
     height: 100%;
     width: 100%;
     position: relative;
   }
   .rs-overlay {
     width: 50%;
   }
   .rs-overlay1,
   .rs-overlay2 {
     width: 100%;
   }
   .rs-overlay,
   .rs-overlay1,
   .rs-overlay2 {
     position: absolute;
     background-color: white;
     z-index: 3;
     top: 0;
     height: 50%;
   }
   .rs-bar {
     display: block;
     position: absolute;
     height: 0;
     z-index: 10;
   }
   .rs-bar.rs-rounded {
     z-index: 5;
   }
   .rs-bar .rs-seperator {
     height: 0px;
     display: block;
     float: left;
   }
   .rs-bar:not(.rs-rounded) .rs-seperator {
     border-left: none;
     border-right: none;
   }
   .rs-bar.rs-start .rs-seperator {
     border-top: none;
   }
   .rs-bar.rs-end .rs-seperator {
     border-bottom: none;
   }
   .rs-bar.rs-start.rs-rounded .rs-seperator {
     border-radius: 0 0 1000px 1000px;
   }
   .rs-bar.rs-end.rs-rounded .rs-seperator {
     border-radius: 1000px 1000px 0 0;
   }
   .full .rs-bar,
   .half .rs-bar {
     width: 50%;
   }
   .half.left .rs-bar,
   .half.right .rs-bar,
   .quarter .rs-bar {
     width: 100%;
   }
   .full .rs-bar,
   .half.left .rs-bar,
   .half.right .rs-bar {
     top: 50%;
   }
   .bottom .rs-bar {
     top: 0;
   }
   .half.right .rs-bar,
   .quarter.right .rs-bar {
     right: 100%;
   }

   .rs-handle.rs-move {
     cursor: move;
   }
   .rs-readonly .rs-handle.rs-move {
     cursor: default;
   }
   .rs-path {
     display: block;
     height: 100%;
     width: 100%;
   }
   .rs-split .rs-path {
     -webkit-border-radius: 1000px 1000px 0 0;
     border-radius: 1000px 1000px 0 0;
     overflow: hidden;
     height: 50%;
     position: absolute;
     top: 0;
     z-index: 2;
   }

   /*** tooltip styles ***/
   .rs-tooltip {
     position: absolute;
     cursor: default;
     border: 1px solid transparent;
     z-index: 10;
     color: var(--primary-text-color);
   }
   .full .rs-tooltip {
     top: 45%;
     left: 50%;
   }
   .bottom .rs-tooltip {
     top: 0;
   }
   .top .rs-tooltip {
     bottom: 0;
   }
   .right .rs-tooltip {
     left: 0;
   }
   .left .rs-tooltip {
     right: 0;
   }
   .half.top .rs-tooltip,
   .half.bottom .rs-tooltip {
     left: 50%;
   }
   .half.left .rs-tooltip,
   .half.right .rs-tooltip {
     top: 50%;
   }
   .rs-tooltip .rs-input {
     outline: 0 none;
     border: none;
     background: transparent;
   }
   .rs-tooltip-text {
     font-size: ${Math.round(this.clientWidth / 6)}px;
     border-radius: 7px;
     text-align: center;
   }
   .rs-tooltip.edit,
   .rs-tooltip .rs-input {
     padding: 5px 8px;
   }
   .rs-tooltip.hover,
   .rs-tooltip.edit:hover {
     border: 1px solid #aaaaaa;
     cursor: pointer;
   }
   .rs-readonly .rs-tooltip.edit:hover {
     border-color: transparent;
     cursor: default;
   }

   /*** handle types ***/
   .rs-handle {
     border-radius: 1000px;
     outline: 0 none;
     float: left;
   }
   .rs-handle.rs-handle-square {
     border-radius: 0px;
   }
   .rs-handle-dot {
     border: 1px solid #aaaaaa;
     padding: 6px;
   }
   .rs-handle-dot:after {
     display: block;
     content: "";
     border: 1px solid #aaaaaa;
     height: 100%;
     width: 100%;
     border-radius: 1000px;
   }

   /*** theming - colors ***/
   .rs-seperator {
     border: 1px solid #aaaaaa;
   }
   .rs-border {
     border: 1px solid #aaaaaa;
   }
   .rs-path-color {
     background-color: #ffffff;
   }
   .rs-range-color {
     background-color: #54bbe0;
   }
   .rs-bg-color {
     background-color: #ffffff;
   }
   .rs-handle {
     background-color: #838383;
   }
   .rs-handle-dot {
     background-color: #ffffff;
   }
   .rs-handle-dot:after {
     background-color: #838383;
   }

    </style>
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
