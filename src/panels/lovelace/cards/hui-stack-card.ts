import { html, LitElement, TemplateResult } from "lit-element";

import { createCardElement } from "../common/create-card-element";

import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

interface Config extends LovelaceCardConfig {
  cards: LovelaceCardConfig[];
}

export abstract class HuiStackCard extends LitElement implements LovelaceCard {
  static get properties() {
    return {
      _config: {},
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
  protected _cards?: LovelaceCard[];
  private _config?: Config;
  private _hass?: HomeAssistant;

  public abstract getCardSize(): number;

  public setConfig(config: Config): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error("Card config incorrect");
    }
    this._config = config;
    this._cards = config.cards.map((card) => {
      const element = this._createCardElement(card) as LovelaceCard;
      return element;
    });
  }

  protected render(): TemplateResult | void {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <div id="root">${this._cards}</div>
    `;
  }

  protected abstract renderStyle(): TemplateResult;

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    const element = createCardElement(cardConfig) as LovelaceCard;
    if (this._hass) {
      element.hass = this._hass;
    }
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this._rebuildCard(element, cardConfig);
      },
      { once: true }
    );
    return element;
  }

  private _rebuildCard(
    element: LovelaceCard,
    config: LovelaceCardConfig
  ): void {
    const newCard = this._createCardElement(config);
    element.replaceWith(newCard);

    const newCardList = this._cards!.slice(0);
    newCardList[this._cards.indexOf(element)] = newCard;
    this._cards = newCardList;
  }
}
