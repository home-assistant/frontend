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
import "../../developer-tools/logs/error-log-card";
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
        <error-log-card .hass=${this.hass}></error-log-card>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        --ha-card-header-color: var(--primary-color);
      }
      error-log-card {
        display: block;
        padding-bottom: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-safe-mode-card": HuiSafeModeCard;
  }
}
