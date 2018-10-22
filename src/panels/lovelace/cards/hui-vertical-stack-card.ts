import { html, LitElement } from "@polymer/lit-element";

import computeCardSize from "../common/compute-card-size.js";
import createCardElement from "../common/create-card-element.js";

import { LovelaceCard, LovelaceConfig } from "../types.ts";

interface Config extends LovelaceConfig {
  cards: LovelaceConfig[];
}

class HuiVerticalStackCard extends LitElement
  implements LovelaceCard {
  protected hass?: HomeAssistant;
  protected config: Config;
  private elements: LovelaceCard[];

  static get properties() {
    return {
      hass: {
        observer: "_hassChanged",
      },
      config: {},
    };
  }

  public getCardSize() {
    let totalSize = 0;
    this.elements.forEach((element) => {
      totalSize += computeCardSize(element);
    });
    return totalSize;
  }

  public setConfig(config: Config) {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error("Card config incorrect");
    }

    this.config = config;

    if (this.shadowRoot) {
      this._buildConfig();
    }
  }

  protected render() {
    if (!this.config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <div id="root">
        ${this.elements!.map(element => element)}
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

  private _buildConfig() {
    this.elements = [];
    this.config.cards.forEach((card) => {
      const element = createCardElement(card);
      element.hass = this.hass;
      this.elements.push(element);
    });
  }

  private _hassChanged(hass) {
    this.elements.forEach((element) => {
      element.hass = hass;
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-vertical-stack-card": HuiVerticalStackCard;
  }
}

customElements.define("hui-vertical-stack-card", HuiVerticalStackCard);
