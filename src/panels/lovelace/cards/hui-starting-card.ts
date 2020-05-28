import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-card";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import "@polymer/paper-spinner/paper-spinner-lite";

@customElement("hui-starting-card")
export class HuiStartingCard extends LitElement implements LovelaceCard {
  @property() public hass?: HomeAssistant;

  public getCardSize(): number {
    return 2;
  }

  public setConfig(_config: LovelaceCardConfig): void {
    // eslint-disable-next-line
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <ha-card
        .header="${this.hass.localize(
          "ui.panel.lovelace.cards.starting.header"
        )}"
      >
        <div class="card-content">
          ${this.hass.localize("ui.panel.lovelace.cards.starting.description")}
        </div>
        <paper-spinner-lite active></paper-spinner-lite>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .content {
        margin-top: -1em;
        padding: 16px;
      }
      paper-spinner-lite {
        display: block;
        margin: auto;
        padding: 20px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-starting-card": HuiStartingCard;
  }
}
