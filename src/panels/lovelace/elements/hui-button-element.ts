import { html, LitElement, PropertyValues } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../../../components/buttons/ha-call-service-button";

import { LovelaceElement, LovelaceElementConfig } from "./types";
import { HomeAssistant, LightEntity } from "../../../types";
import { handleClick } from "../common/handle-click";
import { HassEntity } from "home-assistant-js-websocket";
import { longPress } from "../common/directives/long-press-directive";
import computeStateName from "../../../common/entity/compute_state_name";
import stateIcon from "../../../common/entity/state_icon";
import computeStateDomain from "../../../common/entity/compute_state_domain";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";
import { styleMap } from "lit-html/directives/styleMap";

export class HuiButtonElement extends LitElement implements LovelaceElement {
  private _hass?: HomeAssistant;
  private _config?: LovelaceElementConfig;

  static get properties() {
    return { _config: {} };
  }

  public setConfig(config: LovelaceElementConfig): void {
    if (!config) {
      throw Error("Invalid Configuration");
    }

    this._config = { theme: "default", ...config };
  }

  protected render(): TemplateResult {
    if (!this._hass || !this._config) {
      return html``;
    }

    const stateObj = this._hass.states[this._config.entity];

    return html`
      ${this.renderStyle()}
      ${
        !stateObj
          ? html`
              <div class="not-found">
                Entity not available: ${this._config.entity}
              </div>
            `
          : html`
              <paper-button
                @ha-click="${this._handleTap}"
                @ha-hold="${this._handleHold}"
                .longPress="${longPress()}"
              >
                <div>
                  <ha-icon
                    data-domain="${computeStateDomain(stateObj)}"
                    data-state="${stateObj.state}"
                    .icon="${this._config.icon || stateIcon(stateObj)}"
                    style="${
                      styleMap({
                        filter: this._computeBrightness(stateObj),
                        color: this._computeColor(stateObj),
                      })
                    }"
                  ></ha-icon>
                  <span>
                    ${this._config.name || computeStateName(stateObj)}
                  </span>
                </div>
              </paper-button>
            `
      }
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    if (!this._config || !this.hass) {
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
        ha-icon {
          display: flex;
          margin: auto;
          width: 40%;
          height: 40%;
          color: var(--paper-item-icon-color, #44739e);
        }
        ha-icon[data-domain="light"][data-state="on"],
        ha-icon[data-domain="switch"][data-state="on"],
        ha-icon[data-domain="binary_sensor"][data-state="on"],
        ha-icon[data-domain="fan"][data-state="on"],
        ha-icon[data-domain="sun"][data-state="above_horizon"] {
          color: var(--paper-item-icon-active-color, #fdd835);
        }
        ha-icon[data-state="unavailable"] {
          color: var(--state-icon-unavailable-color);
        }
        state-badge {
          display: flex;
          margin: auto;
          width: 40%;
          height: 40%;
        }
        paper-button {
          display: flex;
          margin: auto;
          text-align: center;
        }
        .not-found {
          flex: 1;
          background-color: yellow;
          padding: 8px;
        }
      </style>
    `;
  }

  private _computeBrightness(stateObj: HassEntity | LightEntity): string {
    if (!stateObj.attributes.brightness) {
      return "";
    }
    const brightness = stateObj.attributes.brightness;
    return `brightness(${(brightness + 245) / 5}%)`;
  }

  private _computeColor(stateObj: HassEntity | LightEntity): string {
    if (!stateObj.attributes.hs_color) {
      return "";
    }
    const { hue, sat } = stateObj.attributes.hs_color;
    if (sat <= 10) {
      return "";
    }
    return `hsl(${hue}, 100%, ${100 - sat / 2}%)`;
  }

  private _handleTap() {
    handleClick(this, this.hass!, this._config!, false);
  }

  private _handleHold() {
    handleClick(this, this.hass!, this._config!, true);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-element": HuiButtonElement;
  }
}

customElements.define("hui-button-element", HuiButtonElement);
