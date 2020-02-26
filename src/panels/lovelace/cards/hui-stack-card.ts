import { html, LitElement, TemplateResult, CSSResult, css } from "lit-element";

import { createCardElement } from "../create-element/create-card-element";
import { LovelaceCard } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { StackCardConfig } from "./types";

export abstract class HuiStackCard extends LitElement implements LovelaceCard {
  static get properties() {
    return {
      _config: {},
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-stack-card-editor" */ "../editor/config-elements/hui-stack-card-editor"
    );
    return document.createElement("hui-stack-card-editor");
  }

  public static getStubConfig(): object {
    return { cards: [] };
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
  private _config?: StackCardConfig;
  private _hass?: HomeAssistant;

  public abstract getCardSize(): number;

  public setConfig(config: StackCardConfig): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error("Card config incorrect");
    }
    this._config = config;
    this._cards = config.cards.map((card) => {
      const element = this._createCardElement(card) as LovelaceCard;
      return element;
    });
    this.requestUpdate();
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      ${this._config.title
        ? html`
            <div class="card-header">${this._config.title}</div>
          `
        : ""}
      <div id="root">${this._cards}</div>
    `;
  }

  protected abstract renderStyle(): TemplateResult;

  static get styles(): CSSResult {
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
