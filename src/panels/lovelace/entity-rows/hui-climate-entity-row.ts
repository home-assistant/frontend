import type { HomeAssistant } from "../../../types";
import type { EntityConfig, LovelaceRow } from "./types";
import type { PropertyValues } from "lit";

import "../../../components/ha-climate-state";
import "../components/hui-generic-entity-row";

import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";

import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";

@customElement("hui-climate-entity-row")
class HuiClimateEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Entity must be specified");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this.hass || !this._config) {
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
        <ha-climate-state .hass=${this.hass} .stateObj=${stateObj}>
        </ha-climate-state>
      </hui-generic-entity-row>
    `;
  }

  static styles = css`
    ha-climate-state {
      text-align: right;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-entity-row": HuiClimateEntityRow;
  }
}
