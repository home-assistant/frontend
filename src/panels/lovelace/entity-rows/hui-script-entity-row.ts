import {
  html,
  LitElement,
  TemplateResult,
  property,
  CSSResult,
  css,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../../../components/entity/ha-entity-toggle";
import "../components/hui-warning";

import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";

class HuiScriptEntityRow extends LitElement implements EntityRow {
  @property() public hass?: HomeAssistant;
  @property() private _config?: EntityConfig;

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
        ${stateObj.attributes.can_cancel
          ? html`
              <ha-entity-toggle
                .hass="${this.hass}"
                .stateObj="${stateObj}"
              ></ha-entity-toggle>
            `
          : html`
              <mwc-button @click="${this._callService}">
                ${this.hass!.localize("ui.card.script.execute")}
              </mwc-button>
            `}
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResult {
    return css`
      mwc-button {
        color: var(--primary-color);
        font-weight: 500;
        margin-right: -0.57em;
      }
    `;
  }

  private _callService(ev): void {
    ev.stopPropagation();
    this.hass!.callService("script", "turn_on", {
      entity_id: this._config!.entity,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-script-entity-row": HuiScriptEntityRow;
  }
}

customElements.define("hui-script-entity-row", HuiScriptEntityRow);
