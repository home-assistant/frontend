import {
  html,
  LitElement,
  TemplateResult,
  property,
  css,
  CSSResult,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../../../components/ha-cover-controls";
import "../../../components/ha-cover-tilt-controls";
import "../components/hui-warning";

import { isTiltOnly } from "../../../util/cover-model";
import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";

class HuiCoverEntityRow extends LitElement implements EntityRow {
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
        ${isTiltOnly(stateObj)
          ? html`
              <ha-cover-tilt-controls
                .hass="${this.hass}"
                .stateObj="${stateObj}"
              ></ha-cover-tilt-controls>
            `
          : html`
              <ha-cover-controls
                .hass="${this.hass}"
                .stateObj="${stateObj}"
              ></ha-cover-controls>
            `}
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-cover-controls,
      ha-cover-tilt-controls {
        margin-right: -0.57em;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-entity-row": HuiCoverEntityRow;
  }
}

customElements.define("hui-cover-entity-row", HuiCoverEntityRow);
