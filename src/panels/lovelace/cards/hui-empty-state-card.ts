import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-card";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { EmptyStateCardConfig } from "./types";

@customElement("hui-empty-state-card")
export class HuiEmptyStateCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  public getCardSize(): number {
    return 2;
  }

  public setConfig(_config: EmptyStateCardConfig): void {
    // eslint-disable-next-line
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-card
        .header=${this.hass.localize(
          "ui.panel.lovelace.cards.empty_state.title"
        )}
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
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .content {
        margin-top: -1em;
        padding: 16px;
      }

      .card-actions a {
        text-decoration: none;
      }

      mwc-button {
        margin-left: -8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-empty-state-card": HuiEmptyStateCard;
  }
}
