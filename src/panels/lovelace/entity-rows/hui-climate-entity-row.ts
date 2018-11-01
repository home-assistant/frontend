import { html, LitElement } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../../../components/ha-climate-state";
import "../components/hui-generic-entity-row";

import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";

class HuiClimateEntityRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;
  private _config?: EntityConfig;

  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
      >
        <ha-climate-state
          .hass=${this.hass}
          .stateObj=${this.hass.states[this._config.entity]}
        ></ha-climate-state>
      </hui-generic-entity-row>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        ha-climate-state {
          text-align: right;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-entity-row": HuiClimateEntityRow;
  }
}

customElements.define("hui-climate-entity-row", HuiClimateEntityRow);
