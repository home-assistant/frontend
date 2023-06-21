import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { property, state } from "lit/decorators";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { createCardElement } from "../create-element/create-card-element";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { StackCardConfig } from "./types";

export abstract class HuiStackCard<T extends StackCardConfig = StackCardConfig>
  extends LitElement
  implements LovelaceCard
{
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-stack-card-editor");
    return document.createElement("hui-stack-card-editor");
  }

  public static getStubConfig(): Record<string, unknown> {
    return { cards: [] };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public editMode?: boolean;

  @property() protected _cards?: LovelaceCard[];

  @state() protected _config?: T;

  public getCardSize(): number | Promise<number> {
    return 1;
  }

  public setConfig(config: T): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error("Invalid configuration");
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

  protected render() {
    if (!this._config || !this._cards) {
      return nothing;
    }

    return html`
      ${this._config.title
        ? html`<h1 class="card-header">${this._config.title}</h1>`
        : ""}
      <div id="root">${this._cards}</div>
    `;
  }

  static get sharedStyles(): CSSResultGroup {
    return css`
      .card-header {
        color: var(--ha-card-header-color, --primary-text-color);
        font-family: var(--ha-card-header-font-family, inherit);
        font-size: var(--ha-card-header-font-size, 24px);
        font-weight: normal;
        margin-block-start: 0px;
        margin-block-end: 0px;
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
