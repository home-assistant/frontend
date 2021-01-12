import "@material/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { UNAVAILABLE_STATES } from "../../../data/entity";

@customElement("more-info-counter")
class MoreInfoCounter extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const disabled = UNAVAILABLE_STATES.includes(this.stateObj!.state);

    return html`
      <div class="actions">
        <mwc-button
          .action="${"increment"}"
          @click=${this._handleActionClick}
          .disabled=${disabled}
        >
          ${this.hass!.localize("ui.card.counter.actions.increment")}
        </mwc-button>
        <mwc-button
          .action="${"decrement"}"
          @click=${this._handleActionClick}
          .disabled=${disabled}
        >
          ${this.hass!.localize("ui.card.counter.actions.decrement")}
        </mwc-button>
        <mwc-button
          .action="${"reset"}"
          @click=${this._handleActionClick}
          .disabled=${disabled}
        >
          ${this.hass!.localize("ui.card.counter.actions.reset")}
        </mwc-button>
      </div>
    `;
  }

  private _handleActionClick(e: MouseEvent): void {
    const action = (e.currentTarget as any).action;
    this.hass.callService("counter", action, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  static get styles(): CSSResult {
    return css`
      .actions {
        margin: 8px 0;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-counter": MoreInfoCounter;
  }
}
