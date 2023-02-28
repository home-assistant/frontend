import { mdiDotsVertical } from "@mdi/js";
import "@thomasloven/round-slider";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  svg,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import { isUnavailableState } from "../../../data/entity";
import { HumidifierEntity } from "../../../data/humidifier";
import { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { HumidifierCardConfig } from "./types";

@customElement("hui-humidifier-card")
export class HuiHumidifierCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-humidifier-card-editor");
    return document.createElement("hui-humidifier-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): HumidifierCardConfig {
    const includeDomains = ["humidifier"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "humidifier", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HumidifierCardConfig;

  @state() private _setHum?: number;

  public getCardSize(): number {
    return 6;
  }

  public setConfig(config: HumidifierCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "humidifier") {
      throw new Error("Specify an entity from within the humidifier domain");
    }

    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const stateObj = this.hass.states[this._config.entity] as HumidifierEntity;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const name =
      this._config!.name ||
      computeStateName(this.hass!.states[this._config!.entity]);
    const targetHumidity =
      stateObj.attributes.humidity !== null &&
      Number.isFinite(Number(stateObj.attributes.humidity))
        ? stateObj.attributes.humidity
        : stateObj.attributes.min_humidity;

    const setHumidity = this._setHum ? this._setHum : targetHumidity;

    const rtlDirection = computeRTLDirection(this.hass);

    const slider = isUnavailableState(stateObj.state)
      ? html` <round-slider disabled="true"></round-slider> `
      : html`
          <round-slider
            class=${classMap({ "round-slider_off": stateObj.state === "off" })}
            .value=${targetHumidity}
            .min=${stateObj.attributes.min_humidity}
            .max=${stateObj.attributes.max_humidity}
            .rtl=${rtlDirection === "rtl"}
            step="1"
            @value-changing=${this._dragEvent}
            @value-changed=${this._setHumidity}
          ></round-slider>
        `;

    const setValues = html`
      <svg viewBox="0 0 24 20">
        <text x="50%" dx="1" y="73%" text-anchor="middle" id="set-values">
          ${isUnavailableState(stateObj.state) ||
          setHumidity === undefined ||
          setHumidity === null
            ? ""
            : svg`
                    ${setHumidity.toFixed()}
                    <tspan dx="-3" dy="-6.5" style="font-size: 4px;">
                      %
                    </tspan>
                    `}
        </text>
      </svg>
    `;
    const currentMode = html`
      <svg viewBox="0 0 40 10" id="humidity">
        <text x="50%" y="50%" text-anchor="middle" id="set-mode">
          ${this.hass!.localize(`state.default.${stateObj.state}`)}
          ${stateObj.attributes.mode && !isUnavailableState(stateObj.state)
            ? html`
                -
                ${this.hass!.localize(
                  `state_attributes.humidifier.mode.${stateObj.attributes.mode}`
                ) || stateObj.attributes.mode}
              `
            : ""}
        </text>
      </svg>
    `;

    return html`
      <ha-card>
        <ha-icon-button
          .path=${mdiDotsVertical}
          class="more-info"
          @click=${this._handleMoreInfo}
          tabindex="0"
        ></ha-icon-button>

        <div class="content">
          <div id="controls">
            <div id="slider">
              ${slider}
              <div id="slider-center">
                <ha-icon-button
                  class="toggle-button"
                  .disabled=${isUnavailableState(stateObj.state)}
                  @click=${this._toggle}
                  tabindex="0"
                >
                  ${setValues}
                </ha-icon-button>
                ${currentMode}
              </div>
            </div>
          </div>
          <div id="info" .title=${name}>${name}</div>
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
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
      | HumidifierCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hass || !this._config || !changedProps.has("hass")) {
      return;
    }

    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (!oldHass || oldHass.states[this._config.entity] !== stateObj) {
      this._setHum = this._getSetHum(stateObj);
    }
  }

  private _getSetHum(stateObj: HassEntity): undefined | number {
    if (isUnavailableState(stateObj.state)) {
      return undefined;
    }

    return stateObj.attributes.humidity;
  }

  private _dragEvent(e): void {
    this._setHum = e.detail.value;
  }

  private _setHumidity(e): void {
    this.hass!.callService("humidifier", "set_humidity", {
      entity_id: this._config!.entity,
      humidity: e.detail.value,
    });
  }

  private _toggle(): void {
    this.hass!.callService("humidifier", "toggle", {
      entity_id: this._config!.entity,
    });
  }

  private _handleMoreInfo() {
    fireEvent(this, "hass-more-info", {
      entityId: this._config!.entity,
    });
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
      }

      .more-info {
        position: absolute;
        cursor: pointer;
        top: 0;
        right: 0;
        border-radius: 100%;
        color: var(--secondary-text-color);
        z-index: 25;
        inset-inline-start: initial;
        inset-inline-end: 0;
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
        direction: ltr;
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
        --round-slider-bar-color: var(--primary-color);
        padding-bottom: 10%;
      }

      .round-slider_off {
        --round-slider-path-color: var(--slider-track-color);
        --round-slider-bar-color: var(--disabled-text-color);
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
      }

      #humidity {
        max-width: 80%;
        transform: translate(0, 350%);
      }

      #set-values {
        font-size: 13px;
        font-family: var(--paper-font-body1_-_font-family);
        font-weight: var(--paper-font-body1_-_font-weight);
      }

      #set-mode {
        fill: var(--secondary-text-color);
        font-size: 4px;
      }

      .toggle-button {
        color: var(--primary-text-color);
        width: 60%;
        height: auto;
        position: absolute;
        max-width: calc(100% - 40px);
        box-sizing: border-box;
        border-radius: 100%;
        top: 39%;
        left: 50%;
        transform: translate(-50%, -50%);
        --mdc-icon-button-size: 100%;
        --mdc-icon-size: 100%;
      }

      #info {
        display: flex-vertical;
        justify-content: center;
        text-align: center;
        padding: 16px;
        margin-top: -60px;
        font-size: var(--name-font-size);
      }

      text {
        fill: var(--primary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-humidifier-card": HuiHumidifierCard;
  }
}
