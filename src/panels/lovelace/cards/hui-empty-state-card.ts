import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/ha-button";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard } from "../types";
import type { EmptyStateCardConfig } from "./types";

@customElement("hui-empty-state-card")
export class HuiEmptyStateCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  public getCardSize(): number {
    return 2;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public setConfig(_config: EmptyStateCardConfig): void {}

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
          <ha-button appearance="plain" href="/config/integrations/dashboard">
            ${this.hass.localize(
              "ui.panel.lovelace.cards.empty_state.go_to_integrations_page"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    .content {
      margin-top: -1em;
      padding: 16px;
    }

    .card-actions a {
      text-decoration: none;
    }

    ha-button {
      margin-left: -8px;
      margin-inline-start: -8px;
      margin-inline-end: initial;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-empty-state-card": HuiEmptyStateCard;
  }
}
