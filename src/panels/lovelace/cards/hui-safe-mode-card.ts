import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  css,
  CSSResult,
  property,
} from "lit-element";
import "@material/mwc-button";

import "../../../components/ha-card";

import { LovelaceCard } from "../types";
import { HomeAssistant } from "../../../types";

@customElement("hui-safe-mode-card")
export class HuiSafeModeCard extends LitElement implements LovelaceCard {
  @property() public hass?: HomeAssistant;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(_config: any): void {
    // No config necessary.
  }

  protected render(): TemplateResult {
    return html`
      <ha-card
        .header=${this.hass!.localize(
          "ui.panel.lovelace.cards.safe-mode.header"
        )}
      >
        <div class="card-content">
          ${this.hass!.localize(
            "ui.panel.lovelace.cards.safe-mode.description"
          )}
        </div>
        <div class="card-actions">
          <a href="/developer-tools/logs">
            <mwc-button>
              ${this.hass!.localize(
                "ui.panel.lovelace.cards.safe-mode.show_errors"
              )}
            </mwc-button>
          </a>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        --ha-card-header-color: var(--primary-color);
      }
      .card-actions a {
        text-decoration: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-safe-mode-card": HuiSafeModeCard;
  }
}
