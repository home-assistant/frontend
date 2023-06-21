import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { ActionRowConfig, LovelaceRow } from "./types";

@customElement("hui-input-button-entity-row")
class HuiInputButtonEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: ActionRowConfig;

  public setConfig(config: ActionRowConfig): void {
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
        <mwc-button
          @click=${this._pressButton}
          .disabled=${stateObj.state === UNAVAILABLE}
        >
          ${this.hass.localize("ui.card.button.press")}
        </mwc-button>
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      mwc-button:last-child {
        margin-right: -0.57em;
      }
    `;
  }

  private _pressButton(ev): void {
    ev.stopPropagation();
    this.hass.callService("input_button", "press", {
      entity_id: this._config!.entity,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-button-entity-row": HuiInputButtonEntityRow;
  }
}
