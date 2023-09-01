import { mdiDotsVertical, mdiPower, mdiWaterPercent } from "@mdi/js";
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
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateColorCss } from "../../../common/entity/state_color";
import { formatNumber } from "../../../common/number/format_number";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import "../../../components/ha-card";
import type { HaCard } from "../../../components/ha-card";
import "../../../components/ha-icon-button";
import { UNAVAILABLE, isUnavailableState } from "../../../data/entity";
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

  @query("ha-card") private _card?: HaCard;

  public getCardSize(): number {
    return 7;
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
        : null;

    const setHumidity = this._setHum ? this._setHum : targetHumidity;

    const rtlDirection = computeRTLDirection(this.hass);

    const slider = isUnavailableState(stateObj.state)
      ? html` <round-slider disabled="true"></round-slider> `
      : html`
          <round-slider
            .value=${targetHumidity}
            .disabled=${targetHumidity === null}
            .min=${stateObj.attributes.min_humidity}
            .max=${stateObj.attributes.max_humidity}
            .rtl=${rtlDirection === "rtl"}
            step="1"
            @value-changing=${this._dragEvent}
            @value-changed=${this._setHumidity}
          ></round-slider>
        `;

    const currentHumidity = svg`
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
            stateObj.attributes.current_humidity != null &&
            !isNaN(stateObj.attributes.current_humidity)
              ? svg`
                  ${formatNumber(
                    stateObj.attributes.current_humidity,
                    this.hass.locale
                  )}
                  <tspan dx="-3" dy="-6.5" style="font-size: 4px;">
                    %
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
              stateObj.state !== UNAVAILABLE && setHumidity != null
                ? formatNumber(setHumidity, this.hass.locale, {
                    maximumFractionDigits: 0,
                  })
                : nothing
            }
          </text>
          <text
            dy="22"
            text-anchor="middle"
            id="set-mode"
          >
            ${
              stateObj.attributes.action
                ? this.hass.formatEntityAttributeValue(stateObj, "action")
                : this.hass.formatEntityState(stateObj)
            }
            ${
              stateObj.state !== UNAVAILABLE && stateObj.attributes.mode
                ? html`
                    - ${this.hass.formatEntityAttributeValue(stateObj, "mode")}
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
          .path=${mdiDotsVertical}
          .label=${this.hass!.localize(
            "ui.panel.lovelace.cards.show_more_info"
          )}
          class="more-info"
          @click=${this._handleMoreInfo}
          tabindex="0"
        ></ha-icon-button>

        <div class="content">
          <div id="controls">
            <div id="slider">
              ${slider}
              <div id="slider-center">
                <div id="humidity">${currentHumidity} ${setValues}</div>
              </div>
            </div>
          </div>
          <div id="info" .title=${name}>
            <div id="modes">
              <ha-icon-button
                class=${classMap({ "selected-icon": stateObj.state === "on" })}
                @click=${this._turnOn}
                tabindex="0"
                .path=${mdiWaterPercent}
                .label=${this.hass!.localize(
                  `component.humidifier.entity_component._.state.on`
                )}
              >
              </ha-icon-button>
              <ha-icon-button
                class=${classMap({ "selected-icon": stateObj.state === "off" })}
                @click=${this._turnOff}
                tabindex="0"
                .path=${mdiPower}
                .label=${this.hass!.localize(
                  `component.humidifier.entity_component._.state.off`
                )}
              >
              </ha-icon-button>
            </div>
            ${name}
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

    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj) {
      return;
    }

    if (!oldHass || oldHass.states[this._config.entity] !== stateObj) {
      this._rescale_svg();
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

  private _turnOn(): void {
    this.hass!.callService("humidifier", "turn_on", {
      entity_id: this._config!.entity,
    });
  }

  private _turnOff(): void {
    this.hass!.callService("humidifier", "turn_off", {
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

      #humidity {
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
    "hui-humidifier-card": HuiHumidifierCard;
  }
}
