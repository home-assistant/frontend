import { html, LitElement } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { createCardElement } from "../common/create-card-element";

import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

interface Config extends LovelaceCardConfig {
  cards: LovelaceCardConfig[];
}

export abstract class HuiStackCard extends LitElement implements LovelaceCard {
  protected _cards?: LovelaceCard[];
  private _config?: Config;
  private _hass?: HomeAssistant;

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

  public abstract getCardSize(): number;

  public setConfig(config: Config): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error("Card config incorrect");
    }
    this._config = config;
    this._cards = config.cards.map((card) => {
      const element = createCardElement(card) as LovelaceCard;
      if (this._hass) {
        element.hass = this._hass;
      }
      return element;
    });
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <div id="root">${this._cards}</div>
    `;
  }

  protected abstract renderStyle(): TemplateResult;
}
