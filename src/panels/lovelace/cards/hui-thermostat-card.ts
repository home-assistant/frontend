import {
  mdiAutorenew,
  mdiCalendarSync,
  mdiDotsVertical,
  mdiFan,
  mdiFire,
  mdiPower,
  mdiSnowflake,
  mdiWaterPercent,
} from "@mdi/js";
import "@thomasloven/round-slider";
import { HassEntity } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
  svg,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { UNIT_F } from "../../../common/const";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateColorCss } from "../../../common/entity/state_color";
import { formatNumber } from "../../../common/number/format_number";
import "../../../components/ha-card";
import type { HaCard } from "../../../components/ha-card";
import "../../../components/ha-icon-button";
import {
  CLIMATE_PRESET_NONE,
  ClimateEntity,
  HvacMode,
  compareClimateHvacModes,
} from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { ThermostatCardConfig } from "./types";

// TODO: Need to align these icon to more info icons
const modeIcons: { [mode in HvacMode]: string } = {
  auto: mdiCalendarSync,
  heat_cool: mdiAutorenew,
  heat: mdiFire,
  cool: mdiSnowflake,
  off: mdiPower,
  fan_only: mdiFan,
  dry: mdiWaterPercent,
};

@customElement("hui-thermostat-card")
export class HuiThermostatCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-thermostat-card-editor");
    return document.createElement("hui-thermostat-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): ThermostatCardConfig {
    const includeDomains = ["climate"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "thermostat", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ThermostatCardConfig;

  @state() private _setTemp?: number | number[];

  @query("ha-card") private _card?: HaCard;

  @state() private resyncSetpoint = false;

  public getCardSize(): number {
    return 7;
  }

  public setConfig(config: ThermostatCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "climate") {
      throw new Error("Specify an entity from within the climate domain");
    }

    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const stateObj = this.hass.states[this._config.entity] as ClimateEntity;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const mode = stateObj.state in modeIcons ? stateObj.state : "unknown-mode";
    const name =
      this._config!.name ||
      computeStateName(this.hass!.states[this._config!.entity]);
    const targetTemp = this.resyncSetpoint
      ? // If the user set position in the slider is out of sync with the entity
        // value, then rerendering the slider with same $value a second time
        // does not move the slider. Need to set it to a different dummy value
        // for one update cycle to force it to rerender to the desired value.
        stateObj.attributes.min_temp - 1
      : stateObj.attributes.temperature !== null &&
        Number.isFinite(Number(stateObj.attributes.temperature))
      ? stateObj.attributes.temperature
      : stateObj.attributes.min_temp;

    const targetLow = this.resyncSetpoint
      ? stateObj.attributes.min_temp - 1
      : stateObj.attributes.target_temp_low;
    const targetHigh = this.resyncSetpoint
      ? stateObj.attributes.min_temp - 1
      : stateObj.attributes.target_temp_high;

    const slider =
      stateObj.state === UNAVAILABLE
        ? html` <round-slider disabled="true"></round-slider> `
        : html`
            <round-slider
              .value=${targetTemp}
              .low=${targetLow}
              .high=${targetHigh}
              .min=${stateObj.attributes.min_temp}
              .max=${stateObj.attributes.max_temp}
              .step=${this._stepSize}
              @value-changing=${this._dragEvent}
              @value-changed=${this._setTemperature}
            ></round-slider>
          `;

    const currentTemperature = svg`
        <svg viewBox="0 0 40 20">
          <text
            x="50%"
            dx="1"
            y="60%"
            text-anchor="middle"
            style="font-size: 13px;"
          >
            ${
              stateObj.state !== UNAVAILABLE &&
              stateObj.attributes.current_temperature != null &&
              !isNaN(stateObj.attributes.current_temperature)
                ? svg`
                    ${formatNumber(
                      stateObj.attributes.current_temperature,
                      this.hass.locale
                    )}
                    <tspan dx="-3" dy="-6.5" style="font-size: 4px;">
                      ${this.hass.config.unit_system.temperature}
                    </tspan>
                  `
                : nothing
            }
          </text>
        </svg>
      `;

    const setValues = svg`
      <svg id="set-values">
        <g>
          <text text-anchor="middle" class="set-value">
            ${
              stateObj.state !== UNAVAILABLE && this._setTemp != null
                ? Array.isArray(this._setTemp)
                  ? svg`
                    ${this._formatSetTemp(this._setTemp[0])} -
                    ${this._formatSetTemp(this._setTemp[1])}
                  `
                  : this._formatSetTemp(this._setTemp)
                : nothing
            }
          </text>
          <text
            dy="22"
            text-anchor="middle"
            id="set-mode"
          >
            ${
              stateObj.state !== UNAVAILABLE && stateObj.attributes.hvac_action
                ? this.hass.formatEntityAttributeValue(stateObj, "hvac_action")
                : this.hass.formatEntityState(stateObj)
            }
            ${
              stateObj.state !== UNAVAILABLE &&
              stateObj.attributes.preset_mode &&
              stateObj.attributes.preset_mode !== CLIMATE_PRESET_NONE
                ? html`
                    -
                    ${this.hass.formatEntityAttributeValue(
                      stateObj,
                      "preset_mode"
                    )}
                  `
                : nothing
            }
          </text>
        </g>
      </svg>
    `;

    return html`
      <ha-card
        style=${styleMap({
          "--mode-color": stateColorCss(stateObj),
        })}
      >
        <ha-icon-button
          class="more-info"
          .label=${this.hass!.localize(
            "ui.panel.lovelace.cards.show_more_info"
          )}
          .path=${mdiDotsVertical}
          @click=${this._handleMoreInfo}
          tabindex="0"
        ></ha-icon-button>

        <div class="content">
          <div id="controls">
            <div id="slider">
              ${slider}
              <div id="slider-center">
                <div id="temperature">${currentTemperature} ${setValues}</div>
              </div>
            </div>
          </div>
          <div id="info" .title=${name}>
            <div id="modes">
              ${(stateObj.attributes.hvac_modes || [])
                .concat()
                .sort(compareClimateHvacModes)
                .map((modeItem) => this._renderIcon(modeItem, mode))}
            </div>
            ${name}
          </div>
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      hasConfigOrEntityChanged(this, changedProps) ||
      changedProps.has("resyncSetpoint")
    );
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (
      !this._config ||
      !this.hass ||
      (!changedProps.has("hass") && !changedProps.has("_config"))
    ) {
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

    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj) {
      return;
    }

    if (!oldHass || oldHass.states[this._config.entity] !== stateObj) {
      this._rescale_svg();
    }
  }

  public willUpdate(changedProps: PropertyValues) {
    if (
      !this.hass ||
      !this._config ||
      !(changedProps.has("hass") || changedProps.has("resyncSetpoint"))
    ) {
      return;
    }

    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      !oldHass ||
      oldHass.states[this._config.entity] !== stateObj ||
      (changedProps.has("resyncSetpoint") && this.resyncSetpoint)
    ) {
      this._setTemp = this._getSetTemp(stateObj);
    }
  }

  private _formatSetTemp(temp: number) {
    return this._stepSize === 1
      ? formatNumber(temp, this.hass!.locale, {
          maximumFractionDigits: 0,
        })
      : formatNumber(temp, this.hass!.locale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
  }

  private _rescale_svg() {
    // Set the viewbox of the SVG containing the set temperature to perfectly
    // fit the text
    // That way it will auto-scale correctly
    // This is not done to the SVG containing the current temperature, because
    // it should not be centered on the text, but only on the value
    const card = this._card;
    if (card) {
      card.updateComplete.then(() => {
        const svgRoot = this.shadowRoot!.querySelector("#set-values")!;
        const box = svgRoot.querySelector("g")!.getBBox()!;
        svgRoot.setAttribute(
          "viewBox",
          `${box.x} ${box!.y} ${box.width} ${box.height}`
        );
        svgRoot.setAttribute("width", `${box.width}`);
        svgRoot.setAttribute("height", `${box.height}`);
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

  private _getSetTemp(
    stateObj: HassEntity
  ): undefined | number | [number, number] {
    if (stateObj.state === UNAVAILABLE) {
      return undefined;
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
      const newVal = e.detail.low;
      this._callServiceHelper(
        stateObj.attributes.target_temp_low,
        newVal,
        "set_temperature",
        {
          target_temp_low: newVal,
          target_temp_high: stateObj.attributes.target_temp_high,
        }
      );
    } else if (e.detail.high) {
      const newVal = e.detail.high;
      this._callServiceHelper(
        stateObj.attributes.target_temp_high,
        newVal,
        "set_temperature",
        {
          target_temp_low: stateObj.attributes.target_temp_low,
          target_temp_high: newVal,
        }
      );
    } else {
      const newVal = e.detail.value;
      this._callServiceHelper(
        stateObj!.attributes.temperature,
        newVal,
        "set_temperature",
        { temperature: newVal }
      );
    }
  }

  private _renderIcon(mode: string, currentMode: string) {
    if (!modeIcons[mode]) {
      return nothing;
    }
    return html`
      <ha-icon-button
        class=${classMap({ "selected-icon": currentMode === mode })}
        .mode=${mode}
        @click=${this._handleAction}
        tabindex="0"
        .path=${modeIcons[mode]}
        .label=${this.hass!.localize(
          `component.climate.entity_component._.state.${mode}`
        ) || mode}
      >
      </ha-icon-button>
    `;
  }

  private _handleMoreInfo() {
    fireEvent(this, "hass-more-info", {
      entityId: this._config!.entity,
    });
  }

  private _handleAction(e: MouseEvent): void {
    this.hass!.callService("climate", "set_hvac_mode", {
      entity_id: this._config!.entity,
      hvac_mode: (e.currentTarget as any).mode,
    });
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

    data.entity_id = this._config!.entity;

    await this.hass!.callService("climate", service, data);

    // After updating temperature, wait 2s and check if the values
    // from call service are reflected in the entity. If not, resync
    // the slider to the entity values.
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

    const newState = this.hass!.states[this._config!.entity] as ClimateEntity;
    delete data.entity_id;

    if (
      Object.entries(data).every(
        ([key, value]) => newState.attributes[key] === value
      )
    ) {
      return;
    }

    this.resyncSetpoint = true;
    await this.updateComplete;
    this.resyncSetpoint = false;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }

      ha-card {
        height: 100%;
        position: relative;
        overflow: hidden;
        --name-font-size: 1.2rem;
        --brightness-font-size: 1.2rem;
        --rail-border-color: transparent;
        --mode-color: var(--state-inactive-color);
      }

      .more-info {
        position: absolute;
        cursor: pointer;
        top: 0;
        right: 0;
        inset-inline-end: 0px;
        inset-inline-start: initial;
        border-radius: 100%;
        color: var(--secondary-text-color);
        z-index: 1;
        direction: var(--direction);
      }

      .content {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
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
        --round-slider-path-color: var(--slider-track-color);
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
        direction: ltr;
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
