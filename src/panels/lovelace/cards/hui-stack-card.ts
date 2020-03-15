import {
  html,
  LitElement,
  TemplateResult,
  CSSResult,
  css,
  property,
} from "lit-element";

import { createCardElement } from "../create-element/create-card-element";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { StackCardConfig } from "./types";

export abstract class HuiStackCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-stack-card-editor" */ "../editor/config-elements/hui-stack-card-editor"
    );
    return document.createElement("hui-stack-card-editor");
  }

  public static getStubConfig(): object {
    return { cards: [] };
  }

  @property() protected _cards?: LovelaceCard[];
  @property() private _config?: StackCardConfig;
  private _hass?: HomeAssistant;

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    if (!this._cards) {
      return;
    }

    for (const element of this._cards) {
      element.hass = this._hass;
    }
  }

  public getCardSize(): number {
    return 1;
  }

  public setConfig(config: StackCardConfig): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error("Card config incorrect");
    }
    this._config = config;
    this._cards = config.cards.map((card) => {
      const element = this._createCardElement(card) as LovelaceCard;
      return element;
    });
  }

  protected render(): TemplateResult {
    if (!this._config || !this._cards) {
      return html``;
    }

    return html`
      ${this._config.title
        ? html`
            <div class="card-header">${this._config.title}</div>
          `
        : ""}
      <div id="root">${this._cards}</div>
    `;
  }

  static get sharedStyles(): CSSResult {
    return css`
      .card-header {
        color: var(--ha-card-header-color, --primary-text-color);
        font-family: var(--ha-card-header-font-family, inherit);
        font-size: var(--ha-card-header-font-size, 24px);
        letter-spacing: -0.012em;
        line-height: 32px;
        display: block;
        padding: 24px 16px 16px;
      }
    `;
  }

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
    cardElToReplace: LovelaceCard,
    config: LovelaceCardConfig
  ): void {
    const newCardEl = this._createCardElement(config);
    cardElToReplace.parentElement!.replaceChild(newCardEl, cardElToReplace);
    this._cards = this._cards!.map((curCardEl) =>
      curCardEl === cardElToReplace ? newCardEl : curCardEl
    );
  }
}
