import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";

import "@polymer/paper-card/paper-card";

import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

export interface Config extends LovelaceCardConfig {
  content: string;
  title?: string;
}

export class HuiEmptyStateCard extends LitElement implements LovelaceCard {
  public hass?: HomeAssistant;

  public getCardSize(): number {
    return 2;
  }

  public setConfig(_config: Config): void {
    // tslint:disable-next-line
  }

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
    };
  }

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return html``;
    }

    return html`
      <paper-card
        .heading="${this.hass.localize(
          "ui.panel.lovelace.cards.empty_state.title"
        )}"
      >
        <div class="card-content">
          ${this.hass.localize(
            "ui.panel.lovelace.cards.empty_state.no_devices"
          )}
        </div>
        <div class="card-actions">
          <a href="/config/integrations">
            <mwc-button>
              ${this.hass.localize(
                "ui.panel.lovelace.cards.empty_state.go_to_integrations_page"
              )}
            </mwc-button>
          </a>
        </div>
      </paper-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .content {
        margin-top: -1em;
        padding: 16px;
      }

      mwc-button {
        margin-left: -8px;
        font-weight: 500;
        color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-empty-state-card": HuiEmptyStateCard;
  }
}

customElements.define("hui-empty-state-card", HuiEmptyStateCard);
