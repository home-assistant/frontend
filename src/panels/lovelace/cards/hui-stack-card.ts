import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { createCardElement } from "../create-element/create-card-element";
import { LovelaceCard, LovelaceCardEditor } from "../types";
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

  @property() public hass?: HomeAssistant;

  @property() public editMode?: boolean;

  @property() protected _cards?: LovelaceCard[];

  @property() private _config?: StackCardConfig;

  public getCardSize(): number | Promise<number> {
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

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (
      !this._cards ||
      (!changedProps.has("hass") && !changedProps.has("editMode"))
    ) {
      return;
    }

    for (const element of this._cards) {
      if (this.hass) {
        element.hass = this.hass;
      }
      if (this.editMode !== undefined) {
        element.editMode = this.editMode;
      }
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this._cards) {
      return html``;
    }

    return html`
      ${this._config.title
        ? html` <div class="card-header">${this._config.title}</div> `
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
    if (this.hass) {
      element.hass = this.hass;
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
    if (cardElToReplace.parentElement) {
      cardElToReplace.parentElement.replaceChild(newCardEl, cardElToReplace);
    }
    this._cards = this._cards!.map((curCardEl) =>
      curCardEl === cardElToReplace ? newCardEl : curCardEl
    );
  }
}
