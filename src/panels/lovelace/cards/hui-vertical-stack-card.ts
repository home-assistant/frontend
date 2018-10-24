import { html, LitElement } from "@polymer/lit-element";

import computeCardSize from "../common/compute-card-size.js";
import createCardElement from "../common/create-card-element.js";

import { LovelaceCard, LovelaceConfig } from "../types";
import { HomeAssistant } from "../../../types";

interface Config extends LovelaceConfig {
  cards: LovelaceConfig[];
}

class HuiVerticalStackCard extends LitElement implements LovelaceCard {
  protected config?: Config;
  private _hass?: HomeAssistant;

  static get properties() {
    return {
      config: {},
    };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    for (const el of this.shadowRoot!.querySelectorAll("#root > *")) {
      const element = el as LovelaceCard;
      element.hass = this._hass;
    }
  }

  public getCardSize() {
    let totalSize = 0;
    for (const element of this.shadowRoot!.querySelectorAll("#root > *")) {
      totalSize += computeCardSize(element);
    }

    return totalSize;
  }

  public setConfig(config: Config) {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error("Card config incorrect");
    }
    this.config = config;
  }

  protected render() {
    if (!this.config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <div id="root">
        ${this.config.cards.map((card) => this.createCardElement(card))}
      </div>
    `;
  }

  private renderStyle() {
    return html`
      <style>
        #root {
          display: flex;
          flex-direction: column;
        }
        #root > * {
          margin: 4px 0 4px 0;
        }
        #root > *:first-child {
          margin-top: 0;
        }
        #root > *:last-child {
          margin-bottom: 0;
        }
      </style>
    `;
  }

  private createCardElement(card: LovelaceConfig): LovelaceCard {
    const element = createCardElement(card) as LovelaceCard;
    element.hass = this._hass;
    return element;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-vertical-stack-card": HuiVerticalStackCard;
  }
}

customElements.define("hui-vertical-stack-card", HuiVerticalStackCard);
