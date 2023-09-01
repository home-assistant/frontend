import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant } from "../../../types";
import { EntitiesCardEntityConfig } from "../cards/types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceRow } from "./types";

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

  static get styles(): CSSResultGroup {
    return css`
      div {
        text-align: right;
      }
      .pointer {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-simple-entity-row": HuiSimpleEntityRow;
  }
}
