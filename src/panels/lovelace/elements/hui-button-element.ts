import { html, LitElement, PropertyValues } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-button/paper-button";

import "../../../components/ha-icon";

import { LovelaceElement, LovelaceElementConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { handleClick } from "../common/handle-click";
import { longPress } from "../common/directives/long-press-directive";
import computeStateName from "../../../common/entity/compute_state_name";
import stateIcon from "../../../common/entity/state_icon";
import computeStateDomain from "../../../common/entity/compute_state_domain";
import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";
import isValidEntityId from "../../../common/entity/valid_entity_id";

export class HuiButtonElement extends LitElement implements LovelaceElement {
  public hass?: HomeAssistant;
  private _config?: LovelaceElementConfig;

  static get properties() {
    return { _config: {} };
  }

  public setConfig(config: LovelaceElementConfig): void {
    if (!config) {
      throw Error("Invalid Configuration");
    }

    if (config.entity && !isValidEntityId(config.entity)) {
      throw new Error("Invalid Entity");
    }

    this._config = { theme: "default", ...config };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this._config.entity
      ? this.hass.states[this._config.entity]
      : undefined;

    return html`
      ${this.renderStyle()}
      <paper-button
        @ha-click="${this._handleTap}"
        @ha-hold="${this._handleHold}"
        .longPress="${longPress()}"
      >
        <div>
          ${
            stateObj
              ? html`
                  <ha-icon
                    .dataDomain="${computeStateDomain(stateObj)}"
                    .dataState="${stateObj.state}"
                    .icon="${this._config.icon || stateIcon(stateObj!)}"
                  ></ha-icon>
                  <span>
                    ${this._config.title || computeStateName(stateObj!)}
                  </span>
                `
              : html`
                  <ha-icon .icon="${this._config.icon}"></ha-icon>
                  <span>${this._config.title}</span>
                `
          }
        </div>
      </paper-button>
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
      </style>
    `;
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
