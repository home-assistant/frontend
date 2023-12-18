import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-valve-controls";
import { ValveEntity } from "../../../data/valve";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-valve-entity-row")
class HuiValveEntityRow extends LitElement implements LovelaceRow {
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

    const stateObj = this.hass.states[this._config.entity] as ValveEntity;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        <ha-valve-controls
          .hass=${this.hass}
          .stateObj=${stateObj}
        ></ha-valve-controls>
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-valve-controls {
        margin-right: -0.57em;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-valve-entity-row": HuiValveEntityRow;
  }
}
