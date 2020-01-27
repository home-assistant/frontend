import {
  LitElement,
  html,
  TemplateResult,
  CSSResult,
  css,
  property,
  customElement,
} from "lit-element";
import "@material/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";

import { HomeAssistant } from "../../../types";

@customElement("more-info-counter")
class MoreInfoCounter extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <div class="actions">
        <mwc-button
          .action="${"increment"}"
          @click="${this._handleActionClick}"
        >
          ${this.hass!.localize("ui.card.counter.actions.increment")}
        </mwc-button>
        <mwc-button
          .action="${"decrement"}"
          @click="${this._handleActionClick}"
        >
          ${this.hass!.localize("ui.card.counter.actions.decrement")}
        </mwc-button>
        <mwc-button .action="${"reset"}" @click="${this._handleActionClick}">
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
        margin: 0 8px;
        padding-top: 20px;
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
