import type { HomeAssistant } from "../../../types";
import type { EntitiesCardEntityConfig } from "../cards/types";
import type { LovelaceRow } from "./types";
import type { PropertyValues } from "lit";

import "../components/hui-generic-entity-row";

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";

import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";

@customElement("hui-simple-entity-row")
class HuiSimpleEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntitiesCardEntityConfig;

  public setConfig(config: EntitiesCardEntityConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        ${this.hass.formatEntityState(stateObj)}
      </hui-generic-entity-row>
    `;
  }

  static styles = css`
    div {
      text-align: right;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-simple-entity-row": HuiSimpleEntityRow;
  }
}
