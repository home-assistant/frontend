import type { PropertyValues } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isUnavailableState } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import type { EntitiesCardEntityConfig } from "../cards/types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import "../components/hui-timestamp-display";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { TimestampRenderingFormat } from "../components/types";
import type { LovelaceRow } from "./types";

interface AITaskEntityConfig extends EntitiesCardEntityConfig {
  format?: TimestampRenderingFormat;
}

@customElement("hui-ai-task-entity-row")
class HuiAITaskEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AITaskEntityConfig;

  public setConfig(config: AITaskEntityConfig): void {
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
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        ${!isUnavailableState(stateObj.state)
          ? html`
              <hui-timestamp-display
                .hass=${this.hass}
                .ts=${new Date(stateObj.state)}
                .format=${this._config.format}
                capitalize
              ></hui-timestamp-display>
            `
          : this.hass.formatEntityState(stateObj)}
      </hui-generic-entity-row>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-ai-task-entity-row": HuiAITaskEntityRow;
  }
}
