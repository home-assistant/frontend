import {
  html,
  LitElement,
  PropertyValues,
  PropertyDeclarations,
} from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { fireEvent } from "../../../common/dom/fire_event";
import { styleMap } from "lit-html/directives/styleMap";
import { HomeAssistant, LightEntity } from "../../../types";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { longPress } from "../common/directives/long-press-directive";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { loadRoundslider } from "../../../resources/jquery.roundslider.ondemand";
import { toggleEntity } from "../common/entity/toggle-entity";

import stateIcon from "../../../common/entity/state_icon";
import computeStateName from "../../../common/entity/compute_state_name";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";

import "../../../components/ha-card";
import "../../../components/ha-icon";

const lightConfig = {
  radius: 80,
  step: 1,
  circleShape: "pie",
  startAngle: 315,
  width: 5,
  min: 1,
  max: 100,
  sliderType: "min-range",
  lineCap: "round",
  handleSize: "+12",
  showTooltip: false,
};

interface Config extends LovelaceCardConfig {
  entity: string;
  name?: string;
  theme?: string;
}

export class HuiLightCard extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  public hass?: HomeAssistant;
  private _config?: Config;
  private _brightnessTimout?: number;
  private _roundSliderStyle?: TemplateResult;
  private _jQuery?: any;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
      roundSliderStyle: {},
      _jQuery: {},
    };
  }

  public getCardSize(): number {
    return 2;
  }

  public setConfig(config: Config): void {
    if (!config.entity || config.entity.split(".")[0] !== "light") {
      throw new Error("Specify an entity from within the light domain.");
    }

    this._config = { theme: "default", ...config };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config!.entity] as LightEntity;

    return html`
      ${this.renderStyle()}
      <ha-card>
        ${
          !stateObj
            ? html`
                <div class="not-found">
                  Entity not available: ${this._config.entity}
                </div>
              `
            : html`
                <div id="light"></div>
                <div id="tooltip">
                  <div class="icon-state">
                    <ha-icon
                      data-state="${stateObj.state}"
                      .icon="${stateIcon(stateObj)}"
                      style="${
                        styleMap({
                          filter: this._computeBrightness(stateObj),
                          color: this._computeColor(stateObj),
                        })
                      }"
                      @ha-click="${this._handleTap}"
                      @ha-hold="${this._handleHold}"
                      .longPress="${longPress()}"
                    ></ha-icon>
                    <div
                      class="brightness"
                      @ha-click="${this._handleTap}"
                      @ha-hold="${this._handleHold}"
                      .longPress="${longPress()}"
                    ></div>
                    <div class="name">
                      ${this._config.name || computeStateName(stateObj)}
                    </div>
                  </div>
                </div>
              `
        }
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected async firstUpdated(): Promise<void> {
    const loaded = await loadRoundslider();

    this._roundSliderStyle = loaded.roundSliderStyle;
    this._jQuery = loaded.jQuery;

    const brightness = this.hass!.states[this._config!.entity].attributes
      .brightness;
    this._jQuery("#light", this.shadowRoot).roundSlider({
      ...lightConfig,
      change: (value) => this._setBrightness(value),
      drag: (value) => this._dragEvent(value),
      start: () => this._showBrightness(),
      stop: () => this._hideBrightness(),
    });
    this.shadowRoot!.querySelector(".brightness")!.innerHTML =
      (Math.round((brightness / 254) * 100) || 0) + "%";
  }

  protected updated(changedProps: PropertyValues): void {
    if (!this._config || !this.hass || !this._jQuery) {
      return;
    }

    const attrs = this.hass!.states[this._config!.entity].attributes;

    this._jQuery("#light", this.shadowRoot).roundSlider({
      value: Math.round((attrs.brightness / 254) * 100) || 0,
    });

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.themes !== this.hass.themes) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private renderStyle(): TemplateResult {
    return html`
      ${this._roundSliderStyle}
      <style>
        :host {
          display: block;
        }
        ha-card {
          position: relative;
          overflow: hidden;
          --brightness-font-color: white;
          --brightness-font-text-shadow: -1px -1px 0 #000, 1px -1px 0 #000,
            -1px 1px 0 #000, 1px 1px 0 #000;
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
          z-index: 15;
        }
        .icon-state {
          display: block;
          margin: auto;
          width: 100%;
          height: 100%;
          transform: translate(0, 25%);
        }
        #light {
          margin: 0 auto;
          padding-top: 16px;
          padding-bottom: 16px;
        }
        #light .rs-bar.rs-transition.rs-first,
        .rs-bar.rs-transition.rs-second {
          z-index: 20 !important;
        }
        #light .rs-range-color {
          background-color: var(--primary-color);
        }
        #light .rs-path-color {
          background-color: var(--disabled-text-color);
        }
        #light .rs-handle {
          background-color: var(--paper-card-background-color, white);
          padding: 7px;
          border: 2px solid var(--disabled-text-color);
        }
        #light .rs-handle.rs-focus {
          border-color: var(--primary-color);
        }
        #light .rs-handle:after {
          border-color: var(--primary-color);
          background-color: var(--primary-color);
        }
        #light .rs-border {
          border-color: var(--rail-border-color);
        }
        #light .rs-inner.rs-bg-color.rs-border,
        #light .rs-overlay.rs-transition.rs-bg-color {
          background-color: var(--paper-card-background-color, white);
        }
        ha-icon {
          margin: auto;
          width: 76px;
          height: 76px;
          color: var(--paper-item-icon-color, #44739e);
          cursor: pointer;
        }
        ha-icon[data-state="on"] {
          color: var(--paper-item-icon-active-color, #fdd835);
        }
        ha-icon[data-state="unavailable"] {
          color: var(--state-icon-unavailable-color);
        }
        .name {
          padding-top: 40px;
          font-size: var(--name-font-size);
        }
        .brightness {
          font-size: var(--brightness-font-size);
          position: absolute;
          margin: 0 auto;
          left: 50%;
          top: 10%;
          transform: translate(-50%);
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
          -moz-transition: opacity 0.5s ease-in-out;
          -webkit-transition: opacity 0.5s ease-in-out;
          cursor: pointer;
          color: var(--brightness-font-color);
          text-shadow: var(--brightness-font-text-shadow);
        }
        .show_brightness {
          opacity: 1;
        }
        .not-found {
          flex: 1;
          background-color: yellow;
          padding: 8px;
        }
      </style>
    `;
  }

  private _dragEvent(e: any): void {
    this.shadowRoot!.querySelector(".brightness")!.innerHTML = e.value + "%";
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
      brightness_pct: e.value,
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

  private _handleTap() {
    toggleEntity(this.hass!, this._config!.entity!);
  }

  private _handleHold() {
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

customElements.define("hui-light-card", HuiLightCard);
