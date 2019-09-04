import {
  LitElement,
  html,
  TemplateResult,
  CSSResult,
  css,
  property,
  PropertyValues,
} from "lit-element";
import "@material/mwc-button";

import { HomeAssistant } from "../../../types";

class MoreInfoTimer extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public stateObj?: any; // TODO

  protected render(): TemplateResult | void {
    if (!this.stateObj) {
      return html``;
    }

    const actions = ["start", "pause", "cancel", "finish"];

    return html`
      <ha-attributes .stateObj="${this.stateObj}"></ha-attributes>
      ${actions.map((state) => {
        return html`
          <mwc-button .action="${state}" @click="${this._handleActionClick}">
            ${state}
          </mwc-button>
        `;
      })}
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (!changedProps.has("stateObj") || !this.stateObj) {
      return;
    }
  }

  private _handleActionClick(e: MouseEvent): void {
    const action = (e.currentTarget as any).action;
    this.hass.callService("timer", action, undefined);
  }

  static get styles(): CSSResult {
    return css``;
  }
}

customElements.define("more-info-timer", MoreInfoTimer);
