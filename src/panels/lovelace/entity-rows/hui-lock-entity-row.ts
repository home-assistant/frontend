import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../components/hui-generic-entity-row";
import "./hui-error-entity-row";

import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";

class HuiLockEntityRow extends hassLocalizeLitMixin(LitElement)
  implements EntityRow {
  public hass?: HomeAssistant;
  private _config?: EntityConfig;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Configuration error");
    }
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-error-entity-row
          .entity="${this._config.entity}"
        ></hui-error-entity-row>
      `;
    }

    return renderTemplate(stateObj);
  }

  protected renderTemplate(stateObj): TemplateResult {
    return html`
      ${this.renderStyle()}
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        <paper-button @click="${this._callService}">
          ${
            stateObj.state === "locked"
              ? this.localize("ui.card.lock.unlock")
              : this.localize("ui.card.lock.lock")
          }
        </paper-button>
      </hui-generic-entity-row>
    `;
  }

  protected renderStyle(): TemplateResult {
    return html`
      <style>
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          margin-right: -0.57em;
        }
      </style>
    `;
  }

  private _callService(ev): void {
    ev.stopPropagation();
    const stateObj = this.hass!.states[this._config!.entity];
    this.hass!.callService(
      "lock",
      stateObj.state === "locked" ? "unlock" : "lock",
      { entity_id: stateObj.entity_id }
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-lock-entity-row": HuiLockEntityRow;
  }
}

customElements.define("hui-lock-entity-row", HuiLockEntityRow);
