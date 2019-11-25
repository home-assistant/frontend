import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
  svg,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import "@polymer/paper-icon-button/paper-icon-button";
import "@thomasloven/round-slider";

import "../../../components/ha-card";
import "../components/hui-warning";
import "../components/hui-unavailable";

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
  @property() private _setTemp?: number | number[];

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
    this.rescale_svg();
  }

  protected firstUpdated(): void {
    this.rescale_svg();
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
    const targetTemp =
      stateObj.attributes.temperature !== null &&
      Number.isFinite(Number(stateObj.attributes.temperature))
        ? stateObj.attributes.temperature
        : stateObj.attributes.min_temp;

    const slider =
      stateObj.state === "unavailable"
        ? html`
            <round-slider disabled="true"></round-slider>
          `
        : html`
            <round-slider
              .value=${targetTemp}
              .low=${stateObj.attributes.target_temp_low}
              .high=${stateObj.attributes.target_temp_high}
              .min=${stateObj.attributes.min_temp}
              .max=${stateObj.attributes.max_temp}
              .step=${this._stepSize}
              @value-changing=${this._dragEvent}
              @value-changed=${this._setTemperature}
            ></round-slider>
          `;

    const currentTemperature = stateObj.attributes.current_temperature
      ? svg`
          <svg viewBox="0 0 40 20">
            <text
              x="50%"
              dx="1"
              y="60%"
              text-anchor="middle"
              style="font-size: 13px;"
            >
              ${stateObj.attributes.current_temperature}
              <tspan dx="-3" dy="-6.5" style="font-size: 4px;">
                ${this.hass.config.unit_system.temperature}
              </tspan>
            </text>
          </svg>
        `
      : "";

    const setValues = svg`
      <svg id="set-values">
        <g>
          <text text-anchor="middle" class="set-value">
            ${
              !this._setTemp
                ? ""
                : Array.isArray(this._setTemp)
                ? this._stepSize === 1
                  ? svg`
                      ${this._setTemp[0].toFixed()} -
                      ${this._setTemp[1].toFixed()}
                      `
                  : svg`
                      ${this._setTemp[0].toFixed(1)} -
                      ${this._setTemp[1].toFixed(1)}
                      `
                : this._stepSize === 1
                ? svg`
                      ${this._setTemp.toFixed()}
                      `
                : svg`
                      ${this._setTemp.toFixed(1)}
                      `
            }
          </text>
          <text
            dy="22"
            text-anchor="middle"
            id="set-mode"
          >
            ${
              stateObj.attributes.hvac_action
                ? this.hass!.localize(
                    `state_attributes.climate.hvac_action.${
                      stateObj.attributes.hvac_action
                    }`
                  )
                : this.hass!.localize(`state.climate.${stateObj.state}`)
            }
            ${
              stateObj.attributes.preset_mode &&
              stateObj.attributes.preset_mode !== CLIMATE_PRESET_NONE
                ? html`
                    -
                    ${this.hass!.localize(
                      `state_attributes.climate.preset_mode.${
                        stateObj.attributes.preset_mode
                      }`
                    ) || stateObj.attributes.preset_mode}
                  `
                : ""
            }
          </text>
        </g>
      </svg>
    `;

    return html`
      <ha-card
        class=${classMap({
          [mode]: true,
        })}
      >
        ${stateObj.state === "unavailable"
          ? html`
              <hui-unavailable
                .text="${this.hass.localize("state.default.unavailable")}"
              ></hui-unavailable>
            `
          : ""}
        <paper-icon-button
          icon="hass:dots-vertical"
          class="more-info"
          @click=${this._handleMoreInfo}
        ></paper-icon-button>

        <div id="controls">
          <div id="slider">
            ${slider}
            <div id="slider-center">
              <div id="temperature">
                ${currentTemperature} ${setValues}
              </div>
            </div>
          </div>
        </div>
        <div id="info">
          <div id="modes">
            ${(stateObj.attributes.hvac_modes || [])
              .concat()
              .sort(compareClimateHvacModes)
              .map((modeItem) => this._renderIcon(modeItem, mode))}
          </div>
          ${name}
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
    this.rescale_svg();
  }

  private rescale_svg() {
    // Set the viewbox of the SVG containing the set temperature to perfectly
    // fit the text
    // That way it will auto-scale correctly
    // This is not done to the SVG containing the current temperature, because
    // it should not be centered on the text, but only on the value
    if (this.shadowRoot && this.shadowRoot.querySelector("ha-card")) {
      (this.shadowRoot.querySelector(
        "ha-card"
      ) as LitElement).updateComplete.then(() => {
        const svgRoot = this.shadowRoot!.querySelector("#set-values");
        const box = svgRoot!.querySelector("g")!.getBBox();
        svgRoot!.setAttribute(
          "viewBox",
          `${box!.x} ${box!.y} ${box!.width} ${box!.height}`
        );
        svgRoot!.setAttribute("width", `${box!.width}`);
        svgRoot!.setAttribute("height", `${box!.height}`);
      });
    }
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
      <paper-icon-button
        class="${classMap({ "selected-icon": currentMode === mode })}"
        .mode="${mode}"
        .icon="${modeIcons[mode]}"
        @click="${this._handleModeClick}"
        tabindex="0"
      ></paper-icon-button>
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
        position: relative;
        overflow: hidden;
        --name-font-size: 1.2rem;
        --brightness-font-size: 1.2rem;
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

      .more-info {
        position: absolute;
        cursor: pointer;
        top: 0;
        right: 0;
        border-radius: 100%;
        color: var(--secondary-text-color);
        z-index: 25;
      }

      #controls {
        display: flex;
        justify-content: center;
        padding: 16px;
        position: relative;
      }

      #slider {
        height: 100%;
        width: 100%;
        position: relative;
        max-width: 250px;
        min-width: 100px;
      }

      round-slider {
        --round-slider-path-color: var(--disabled-text-color);
        --round-slider-bar-color: var(--mode-color);
        padding-bottom: 10%;
      }

      #slider-center {
        position: absolute;
        width: calc(100% - 40px);
        height: calc(100% - 40px);
        box-sizing: border-box;
        border-radius: 100%;
        left: 20px;
        top: 20px;
        text-align: center;
        overflow-wrap: break-word;
        pointer-events: none;
      }

      #temperature {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 50%;
        top: 45%;
        left: 50%;
      }

      #set-values {
        max-width: 80%;
        transform: translate(0, -50%);
        font-size: 20px;
      }

      #set-mode {
        fill: var(--secondary-text-color);
        font-size: 16px;
      }

      #info {
        display: flex-vertical;
        justify-content: center;
        text-align: center;
        padding: 16px;
        margin-top: -60px;
        font-size: var(--name-font-size);
      }

      #modes > * {
        color: var(--disabled-text-color);
        cursor: pointer;
        display: inline-block;
      }

      #modes .selected-icon {
        color: var(--mode-color);
      }

      text {
        fill: var(--primary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-thermostat-card": HuiThermostatCard;
  }
}
