import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { LovelaceCardConfig } from "../../../src/data/lovelace/config/card";
import "../../../src/panels/lovelace/cards/hui-card";
import type { HomeAssistant } from "../../../src/types";
import { embedHassContext } from "./context";

/**
 * Renders a Lovelace card with the backend of the closest
 * `ha-embed-provider`.
 */
@customElement("ha-embed-card")
export class HaEmbedCard extends LitElement {
  /** The card configuration, as a JSON object in the attribute. */
  @property({ type: Object }) public config?: LovelaceCardConfig;

  @consume({ context: embedHassContext, subscribe: true })
  @state()
  private _hass?: HomeAssistant;

  protected render() {
    if (!this._hass || !this.config) {
      return nothing;
    }
    return html`<hui-card
      .hass=${this._hass}
      .config=${this.config}
    ></hui-card>`;
  }

  static styles = css`
    :host {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-embed-card": HaEmbedCard;
  }
}
