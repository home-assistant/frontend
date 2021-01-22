import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-lock-entity-row")
class HuiLockEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
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
          @click="${this._callService}"
          .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
          class="text-content"
        >
          ${stateObj.state === "locked"
            ? this.hass!.localize("ui.card.lock.unlock")
            : this.hass!.localize("ui.card.lock.lock")}
        </mwc-button>
      </hui-generic-entity-row>
    `;
  }

  static get styles(): CSSResult {
    return css`
      mwc-button {
        margin-right: -0.57em;
      }
    `;
  }

  private _callService(ev): void {
    ev.stopPropagation();
    const stateObj = this.hass!.states[this._config!.entity];
    this.hass!.callService(
      "lock",
      stateObj.state === "locked" ? "unlock" : "lock",
      { entity_id: stateObj.entity_id }
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-lock-entity-row": HuiLockEntityRow;
  }
}
