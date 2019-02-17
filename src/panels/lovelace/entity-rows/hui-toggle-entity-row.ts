import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../../../components/entity/ha-entity-toggle";
import "../components/hui-warning";

import computeStateDisplay from "../../../common/entity/compute_state_display";
import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";

class HuiToggleEntityRow extends LitElement implements EntityRow {
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

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning .entity="${this._config.entity}"></hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        ${stateObj.state === "on" || stateObj.state === "off"
          ? html`
              <ha-entity-toggle
                .hass="${this.hass}"
                .stateObj="${stateObj}"
              ></ha-entity-toggle>
            `
          : html`
              <div>
                ${computeStateDisplay(
                  this.hass!.localize,
                  stateObj,
                  this.hass!.language
                )}
              </div>
            `}
      </hui-generic-entity-row>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-toggle-entity-row": HuiToggleEntityRow;
  }
}

customElements.define("hui-toggle-entity-row", HuiToggleEntityRow);
