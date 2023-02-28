import "@material/mwc-button/mwc-button";
import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";

@customElement("hui-starting-card")
export class HuiStartingCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  public getCardSize(): number {
    return 2;
  }

  public setConfig(_config: LovelaceCardConfig): void {
    // eslint-disable-next-line
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (!changedProperties.has("hass") || !this.hass!.config) {
      return;
    }

    if (this.hass!.config.state !== STATE_NOT_RUNNING) {
      fireEvent(this, "config-refresh");
    }
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="content">
        <ha-circular-progress active></ha-circular-progress>
        ${this.hass.localize("ui.panel.lovelace.cards.starting.description")}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        height: calc(100vh - var(--header-height));
      }
      ha-circular-progress {
        padding-bottom: 20px;
      }
      .content {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-starting-card": HuiStartingCard;
  }
}
