import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-humidifier-state";
import type { HumidifierEntity } from "../../../data/humidifier";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-humidifier-entity-row")
class HuiHumidifierEntityRow extends LitElement implements LovelaceRow {
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

    const stateObj = this.hass.states[this._config.entity] as HumidifierEntity;

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        <ha-humidifier-state .hass=${this.hass} .stateObj=${stateObj}>
        </ha-humidifier-state>
      </hui-generic-entity-row>
    `;
  }

  static styles = css`
    ha-humidifier-state {
      text-align: right;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-humidifier-entity-row": HuiHumidifierEntityRow;
  }
}
