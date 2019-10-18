import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  property,
  customElement,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import "@thomasloven/round-slider";

import { stateIcon } from "../../../common/entity/state_icon";
import { computeStateName } from "../../../common/entity/compute_state_name";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";

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
      ${this.renderStyle()}
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

        <div id="light">
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
            class="light-icon"
            data-state="${stateObj.state}"
            .icon="${this._config.icon || stateIcon(stateObj)}"
            style="${styleMap({
              filter: this._computeBrightness(stateObj),
              color: this._computeColor(stateObj),
            })}"
            @click="${this._handleClick}"
          ></ha-icon>
        </div>

        <div id="tooltip">
          <div class="brightness" @ha-click="${this._handleClick}">
            ${brightness} %
          </div>
          <div class="name">
            ${this._config.name || computeStateName(stateObj)}
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
    if (!this._config || !this.hass) {
      return;
    }

    const stateObj = this.hass!.states[this._config!.entity];

    if (!stateObj) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.themes !== this.hass.themes) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host {
          display: block;
        }

        ha-card {
          position: relative;
          overflow: hidden;
          --name-font-size: 1.2rem;
          --brightness-font-size: 1.2rem;
          --rail-border-color: transparent;
        }

        #tooltip {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          text-align: center;
        }

        #light {
          margin: auto;
          padding-top: 0;
          padding-bottom: 32px;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 160px;
          width: 160px;
        }
        #light round-slider {
          margin: 0 auto;
          display: inline-block;
          --round-slider-path-color: var(--disabled-text-color);
          --round-slider-bar-color: var(--primary-color);
          z-index: 20;
        }

        .light-icon {
          position: absolute;
          margin: 0 auto;
          width: 76px;
          height: 76px;
          color: var(--paper-item-icon-color, #44739e);
          cursor: pointer;
          z-index: 20;
        }

        .light-icon[data-state="on"] {
          color: var(--paper-item-icon-active-color, #fdd835);
        }

        .light-icon[data-state="unavailable"] {
          color: var(--state-icon-unavailable-color);
        }

        .name {
          position: absolute;
          font-size: var(--name-font-size);
          bottom: 16px;
          box-sizing: border-box;
          text-align: center;
          width: 100%;
          padding: 0 16px;
        }

        .brightness {
          font-size: var(--brightness-font-size);
          position: absolute;
          margin: 0 auto;
          top: 135px;
          left: 50%;
          transform: translate(-50%);
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

  private _dragEvent(e: any): void {
    this.shadowRoot!.querySelector(".brightness")!.innerHTML =
      e.detail.value + "%";
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-card": HuiLightCard;
  }
}
