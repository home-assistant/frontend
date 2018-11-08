import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../components/hui-generic-entity-row";
import "../../../components/entity/ha-entity-toggle";
import "./hui-error-entity-row";

import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";

class HuiSceneEntityRow extends hassLocalizeLitMixin(LitElement)
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

    return html`
      ${this.renderStyle()}
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        ${
          stateObj.attributes.can_cancel
            ? html`
                <ha-entity-toggle
                  .hass="${this.hass}"
                  .stateObj="${stateObj}"
                ></ha-entity-toggle>
              `
            : html`
                <paper-button @click="${this._callService}">
                  ${this.localize("ui.card.scene.activate")}
                </paper-button>
              `
        }
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

  private _callService(): void {
    this.hass!.callService("scene", "turn_on", {
      entity_id: this._config!.entity,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-scene-entity-row": HuiSceneEntityRow;
  }
}

customElements.define("hui-scene-entity-row", HuiSceneEntityRow);
