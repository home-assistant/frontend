import { html, LitElement, PropertyValues } from "@polymer/lit-element";
import { fireEvent } from "../../../common/dom/fire_event.js";
import { styleMap } from "lit-html/directives/styleMap.js";
import computeStateName from "../../../common/entity/compute_state_name.js";
import stateIcon from "../../../common/entity/state_icon.js";
import { jQuery } from "../../../resources/jquery";

import "../../../components/ha-card.js";
import "../../../components/ha-icon.js";
import { roundSliderStyle } from "../../../resources/jquery.roundslider";

import { HomeAssistant, LightEntity } from "../../../types.js";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceCard, LovelaceConfig } from "../types.js";
import { longPress } from "../common/directives/long-press-directive";

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

interface Config extends LovelaceConfig {
  entity: string;
  name?: string;
}

export class HuiLightCard extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  public hass?: HomeAssistant;
  private _config?: Config;
  private _brightnessTimout?: NodeJS.Timer;

  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  public getCardSize() {
    return 2;
  }

  public setConfig(config: Config) {
    if (!config.entity || config.entity.split(".")[0] !== "light") {
      throw new Error("Specify an entity from within the light domain.");
    }

    this._config = config;
  }

  protected render() {
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
              <div class="not-found">Entity not available: ${
                this._config.entity
              }</div>`
            : html`
              <div id="light"></div>
              <div id="tooltip">
                <div class="icon-state">
                  <ha-icon
                    data-state="${stateObj.state}"
                    .icon="${stateIcon(stateObj)}"
                    style="${styleMap({
                      filter: this._computeBrightness(stateObj),
                      color: this._computeColor(stateObj),
                    })}"
                    @ha-click="${() => this._handleClick(false)}"
                    @ha-hold="${() => this._handleClick(true)}"
                    .longPress="${longPress()}"
                  ></ha-icon>
                  <div
                    class="brightness"
                    @ha-click="${() => this._handleClick(false)}"
                    @ha-hold="${() => this._handleClick(true)}"
                    .longPress="${longPress()}"
                  ></div>
                  <div class="name">${this._config.name ||
                    computeStateName(stateObj)}</div>
                </div>
              </div>
            `
        }

      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues) {
    if (changedProps.get("hass")) {
      return (
        (changedProps.get("hass") as any).states[this._config!.entity] !==
        this.hass!.states[this._config!.entity]
      );
    }
    return (changedProps as unknown) as boolean;
  }

  protected firstUpdated() {
    const brightness = this.hass!.states[this._config!.entity].attributes
      .brightness;
    jQuery("#light", this.shadowRoot).roundSlider({
      ...lightConfig,
      change: (value) => this._setBrightness(value),
      drag: (value) => this._dragEvent(value),
      start: () => this._showBrightness(),
      stop: () => this._hideBrightness(),
    });
    this.shadowRoot!.querySelector(".brightness")!.innerHTML =
      (Math.round((brightness / 254) * 100) || 0) + "%";
  }

  protected updated() {
    const attrs = this.hass!.states[this._config!.entity].attributes;

    jQuery("#light", this.shadowRoot).roundSlider({
      value: Math.round((attrs.brightness / 254) * 100) || 0,
    });
  }

  private renderStyle() {
    return html`
    ${roundSliderStyle}
    <style>
      :host {
        display: block;
      }
      ha-card {
        position: relative;
        overflow: hidden;
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
        transform: translate(0,25%);
      }
      #light {
        margin: 0 auto;
        padding-top: 16px;
        padding-bottom: 16px;
      }
      #light .rs-bar.rs-transition.rs-first, .rs-bar.rs-transition.rs-second{
        z-index: 20 !important;
      }
      #light .rs-range-color  {
        background-color: var(--primary-color);
      }
      #light .rs-path-color  {
          background-color: #d6d6d6;
      }
      #light .rs-handle  {
          background-color: #FFF;
          padding: 7px;
          border: 2px solid #d6d6d6;
      }
      #light .rs-handle.rs-focus  {
          border-color:var(--primary-color);
      }
      #light .rs-handle:after  {
          border-color: var(--primary-color);
          background-color: var(--primary-color);
      }
      #light .rs-border  {
        border-color: transparent;
      }
      ha-icon {
        margin: auto;
        width: 76px;
        height: 76px;
        color: var(--paper-item-icon-color, #44739e);
        cursor: pointer;
      }
      ha-icon[data-state=on] {
        color: var(--paper-item-icon-active-color, #FDD835);
      }
      ha-icon[data-state=unavailable] {
        color: var(--state-icon-unavailable-color);
      }
      .name {
        padding-top: 40px;
        font-size: 1.2rem;
      }
      .brightness {
        font-size: 1.2rem;
        position: absolute;
        margin: 0 auto;
        left: 50%;
        top: 10%;
        transform: translate(-50%);
        opacity: 0;
        transition: opacity .5s ease-in-out;
        -moz-transition: opacity .5s ease-in-out;
        -webkit-transition: opacity .5s ease-in-out;
        cursor: pointer;
        color: white;
        text-shadow:
          -1px -1px 0 #000,
          1px -1px 0 #000,
          -1px 1px 0 #000,
          1px 1px 0 #000;
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

  private _dragEvent(e) {
    this.shadowRoot!.querySelector(".brightness")!.innerHTML = e.value + "%";
  }

  private _showBrightness() {
    clearTimeout(this._brightnessTimout);
    this.shadowRoot!.querySelector(".brightness")!.classList.add(
      "show_brightness"
    );
  }

  private _hideBrightness() {
    this._brightnessTimout = setTimeout(() => {
      this.shadowRoot!.querySelector(".brightness")!.classList.remove(
        "show_brightness"
      );
    }, 500);
  }

  private _setBrightness(e) {
    this.hass!.callService("light", "turn_on", {
      entity_id: this._config!.entity,
      brightness_pct: e.value,
    });
  }

  private _computeBrightness(stateObj: LightEntity) {
    if (!stateObj.attributes.brightness) {
      return "";
    }
    const brightness = stateObj.attributes.brightness;
    return `brightness(${(brightness + 245) / 5}%)`;
  }

  private _computeColor(stateObj: LightEntity) {
    if (!stateObj.attributes.hs_color) {
      return "";
    }
    const [hue, sat] = stateObj.attributes.hs_color;
    if (sat <= 10) {
      return "";
    }
    return `hsl(${hue}, 100%, ${100 - sat / 2}%)`;
  }

  private _handleClick(hold: boolean) {
    const entityId = this._config!.entity;

    if (hold) {
      fireEvent(this, "hass-more-info", {
        entityId,
      });
      return;
    }

    this.hass!.callService("light", "toggle", {
      entity_id: entityId,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-card": HuiLightCard;
  }
}

customElements.define("hui-light-card", HuiLightCard);
