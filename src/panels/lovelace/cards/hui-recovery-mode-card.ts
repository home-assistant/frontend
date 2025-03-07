import "@material/mwc-button";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-card";
import type { HomeAssistant } from "../../../types";
import "../../config/logs/error-log-card";
import type { LovelaceCard } from "../types";

@customElement("hui-recovery-mode-card")
export class HuiRecoveryModeCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

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
          "ui.panel.lovelace.cards.recovery-mode.header"
        )}
      >
        <div class="card-content">
          ${this.hass!.localize(
            "ui.panel.lovelace.cards.recovery-mode.description"
          )}
        </div>
        <error-log-card .hass=${this.hass} provider="core"></error-log-card>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      --ha-card-header-color: var(--primary-color);
    }
    error-log-card {
      display: block;
      padding-bottom: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-recovery-mode-card": HuiRecoveryModeCard;
  }
}
