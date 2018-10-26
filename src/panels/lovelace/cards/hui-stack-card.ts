import { html, LitElement } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import createCardElement from "../common/create-card-element.js";

import { LovelaceCard, LovelaceConfig } from "../types";
import { HomeAssistant } from "../../../types";

interface Config extends LovelaceConfig {
  cards: LovelaceConfig[];
}

export default abstract class HuiStackCard extends LitElement
  implements LovelaceCard {
  protected config?: Config;
  protected _cards?: LovelaceCard[];
  private _hass?: HomeAssistant;

  static get properties() {
    return {
      config: {},
    };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    if (!this._cards) {
      return;
    }

    for (const element of this._cards) {
      element.hass = this._hass;
    }
  }

  public abstract getCardSize(): number;

  public setConfig(config: Config): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error("Card config incorrect");
    }
    this.config = config;
    this._cards = config.cards.map((card) => {
      const element = createCardElement(card) as LovelaceCard;
      element.hass = this._hass;
      return element;
    });
  }

  protected render(): TemplateResult {
    if (!this.config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <div id="root">
        ${this._cards}
      </div>
    `;
  }

  protected abstract renderStyle(): TemplateResult;
}
