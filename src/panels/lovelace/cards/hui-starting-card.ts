import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  PropertyValues,
} from "lit-element";
import "../../../components/ha-card";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import "@polymer/paper-spinner/paper-spinner-lite";
import { fireEvent } from "../../../common/dom/fire_event";
import { STATE_STARTING, STATE_RUNNING } from "home-assistant-js-websocket";

@customElement("hui-starting-card")
export class HuiStartingCard extends LitElement implements LovelaceCard {
  @property() public hass?: HomeAssistant;

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

    const oldHass = changedProperties.get("hass") as HomeAssistant | undefined;

    if (
      (!oldHass?.config || oldHass.config.state !== this.hass!.config.state) &&
      (this.hass!.config.state === STATE_STARTING ||
        this.hass!.config.state === STATE_RUNNING)
    ) {
      fireEvent(this, "config-refresh");
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <div class="content">
        <paper-spinner-lite active></paper-spinner-lite>
        ${this.hass.localize("ui.panel.lovelace.cards.starting.description")}
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        height: calc(100vh - 64px);
      }
      paper-spinner-lite {
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
