import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-cover-controls";
import "../../../components/ha-cover-tilt-controls";
import type { CoverEntity } from "../../../data/cover";
import { isTiltOnly } from "../../../data/cover";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-cover-entity-row")
class HuiCoverEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
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

    const stateObj = this.hass.states[this._config.entity] as CoverEntity;

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        ${isTiltOnly(stateObj)
          ? html`
              <ha-cover-tilt-controls
                .hass=${this.hass}
                .stateObj=${stateObj}
              ></ha-cover-tilt-controls>
            `
          : html`
              <ha-cover-controls
                .hass=${this.hass}
                .stateObj=${stateObj}
              ></ha-cover-controls>
            `}
      </hui-generic-entity-row>
    `;
  }

  static styles = css`
    ha-cover-controls,
    ha-cover-tilt-controls {
      margin-right: -0.57em;
      margin-inline-end: -0.57em;
      margin-inline-start: initial;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-entity-row": HuiCoverEntityRow;
  }
}
