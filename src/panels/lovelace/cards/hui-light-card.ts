import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  property,
  customElement,
  css,
  CSSResult,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import "@thomasloven/round-slider";

import { stateIcon } from "../../../common/entity/state_icon";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";

import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../components/hui-warning";
import "../components/hui-unavailable";

import { fireEvent } from "../../../common/dom/fire_event";
import { styleMap } from "lit-html/directives/style-map";
import { HomeAssistant, LightEntity } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { toggleEntity } from "../common/entity/toggle-entity";
import { LightCardConfig } from "./types";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { SUPPORT_BRIGHTNESS } from "../../../data/light";
import { actionHandler } from "../common/directives/action-handler-directive";

@customElement("hui-light-card")
export class HuiLightCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-light-card-editor" */ "../editor/config-elements/hui-light-card-editor");
    return document.createElement("hui-light-card-editor");
  }
  public static getStubConfig(): object {
    return { entity: "" };
  }

  @property() public hass?: HomeAssistant;

  @property() private _config?: LightCardConfig;

  private _brightnessTimout?: number;

  public getCardSize(): number {
    return 2;
  }

  public setConfig(config: LightCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "light") {
      throw new Error("Specify an entity from within the light domain.");
    }

    this._config = { theme: "default", ...config };
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config!.entity] as LightEntity;
    const brightness =
      Math.round((stateObj.attributes.brightness / 254) * 100) || 0;

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

    return html`
      <ha-card>
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
          @click="${this._handleMoreInfo}"
        ></paper-icon-button>

        <div id="controls">
          <div id="slider">
            ${supportsFeature(stateObj, SUPPORT_BRIGHTNESS)
              ? html`
                  <round-slider
                    min="1"
                    .value=${brightness}
                    @value-changing=${this._dragEvent}
                    @value-changed=${this._setBrightness}
                  ></round-slider>
                `
              : ""}
            <ha-icon
              class="slider-center"
              data-state="${stateObj.state}"
              .icon="${this._config.icon || stateIcon(stateObj)}"
              style="${styleMap({
                filter: this._computeBrightness(stateObj),
                color: this._computeColor(stateObj),
              })}"
              @action="${this._handleClick}"
              .actionHandler=${actionHandler()}
              tabindex="0"
            ></ha-icon>
          </div>
        </div>

        <div id="info">
          <div class="brightness" @ha-click="${this._handleClick}">
            %
          </div>
          ${this._config.name || computeStateName(stateObj)}
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    const stateObj = this.hass!.states[this._config!.entity];

    if (!stateObj) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | LightCardConfig
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

  private _dragEvent(e: any): void {
    this.shadowRoot!.querySelector(".brightness")!.innerHTML = `&nbsp;&nbsp;${
      e.detail.value
    } %`;
    this._showBrightness();
    this._hideBrightness();
  }

  private _showBrightness(): void {
    clearTimeout(this._brightnessTimout);
    this.shadowRoot!.querySelector(".brightness")!.classList.add(
      "show_brightness"
    );
  }

  private _hideBrightness(): void {
    this._brightnessTimout = window.setTimeout(() => {
      this.shadowRoot!.querySelector(".brightness")!.classList.remove(
        "show_brightness"
      );
    }, 500);
  }

  private _setBrightness(e: any): void {
    this.hass!.callService("light", "turn_on", {
      entity_id: this._config!.entity,
      brightness_pct: e.detail.value,
    });
  }

  private _computeBrightness(stateObj: LightEntity): string {
    if (!stateObj.attributes.brightness) {
      return "";
    }
    const brightness = stateObj.attributes.brightness;
    return `brightness(${(brightness + 245) / 5}%)`;
  }

  private _computeColor(stateObj: LightEntity): string {
    if (!stateObj.attributes.hs_color) {
      return "";
    }
    const [hue, sat] = stateObj.attributes.hs_color;
    if (sat <= 10) {
      return "";
    }
    return `hsl(${hue}, 100%, ${100 - sat / 2}%)`;
  }

  private _handleClick() {
    toggleEntity(this.hass!, this._config!.entity!);
  }

  private _handleMoreInfo() {
    fireEvent(this, "hass-more-info", {
      entityId: this._config!.entity,
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
        max-width: 200px;
        min-width: 100px;
      }

      round-slider {
        --round-slider-path-color: var(--disabled-text-color);
        --round-slider-bar-color: var(--primary-color);
        padding-bottom: 10%;
      }

      .slider-center {
        position: absolute;
        width: 70%;
        height: 70%;
        max-height: calc(100% - 40px);
        max-width: calc(100% - 40px);
        box-sizing: border-box;
        border-radius: 100%;
        top: 50%;
        left: 50%;
        color: var(--paper-item-icon-color, #44739e);
        cursor: pointer;
        transform: translate(-50%, -50%);
      }
      .slider-center:focus {
        outline: none;
        background: var(--divider-color);
      }

      .slider-center[data-state="on"] {
        color: var(--paper-item-icon-active-color, #fdd835);
      }

      .slider-center[data-state="unavailable"] {
        color: var(--state-icon-unavailable-color);
      }

      #info {
        display: flex-vertical;
        justify-content: center;
        text-align: center;
        margin-top: -56px;
        padding: 16px;
        font-size: var(--name-font-size);
      }

      .brightness {
        font-size: var(--brightness-font-size);
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        -moz-transition: opacity 0.5s ease-in-out;
        -webkit-transition: opacity 0.5s ease-in-out;
        cursor: pointer;
        pointer-events: none;
      }

      .show_brightness {
        opacity: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-card": HuiLightCard;
  }
}
