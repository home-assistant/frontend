import Fuse from "fuse.js";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { until } from "lit-html/directives/until";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../common/search/search-input";
import { UNAVAILABLE_STATES } from "../../../../data/entity";
import { LovelaceCardConfig, LovelaceConfig } from "../../../../data/lovelace";
import {
  CustomCardEntry,
  customCards,
  CUSTOM_TYPE_PREFIX,
  getCustomCardEntry,
} from "../../../../data/lovelace_custom_cards";
import { HomeAssistant } from "../../../../types";
import {
  calcUnusedEntities,
  computeUsedEntities,
} from "../../common/compute-unused-entities";
import { createCardElement } from "../../create-element/create-card-element";
import { LovelaceCard } from "../../types";
import { getCardStubConfig } from "../get-card-stub-config";
import { CardPickTarget, Card } from "../types";
import { coreCards } from "../lovelace-cards";
import { styleMap } from "lit-html/directives/style-map";

interface CardElement {
  card: Card;
  element: TemplateResult;
}

@customElement("hui-card-picker")
export class HuiCardPicker extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() private _cards: CardElement[] = [];

  public lovelace?: LovelaceConfig;

  public cardPicked?: (cardConf: LovelaceCardConfig) => void;

  private _filter?: string;

  private _unusedEntities?: string[];

  private _usedEntities?: string[];

  private _width?: number;

  private _height?: number;

  private _filterCards = memoizeOne(
    (cardElements: CardElement[], filter?: string): CardElement[] => {
      if (filter) {
        let cards = cardElements.map(
          (cardElement: CardElement) => cardElement.card
        );
        const options: Fuse.IFuseOptions<Card> = {
          keys: ["type", "name", "description"],
          isCaseSensitive: false,
          minMatchCharLength: 2,
          threshold: 0.2,
        };
        const fuse = new Fuse(cards, options);
        cards = fuse.search(filter).map((result) => result.item);
        cardElements = cardElements.filter((cardElement: CardElement) =>
          cards.includes(cardElement.card)
        );
      }
      return cardElements;
    }
  );

  protected render(): TemplateResult {
    if (
      !this.hass ||
      !this.lovelace ||
      !this._unusedEntities ||
      !this._usedEntities
    ) {
      return html``;
    }

    return html`
      <search-input
        .filter=${this._filter}
        no-label-float
        @value-changed=${this._handleSearchChange}
      ></search-input>
      <div
        style=${styleMap({
          width: `${this._width}px`,
          height: `${this._height}px`,
        })}
      >
        <div class="cards-container">
          ${this._filterCards(this._cards, this._filter).map(
            (cardElement: CardElement) => cardElement.element
          )}
        </div>
        <div class="cards-container">
          <div
            class="card manual"
            @click=${this._cardPicked}
            .config=${{ type: "" }}
          >
            <div class="preview description">
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.card.generic.manual_description`
              )}
            </div>
            <div class="card-header">
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.card.generic.manual`
              )}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass) {
      return true;
    }

    if (oldHass.language !== this.hass!.language) {
      return true;
    }

    return false;
  }

  protected firstUpdated(): void {
    if (!this.hass || !this.lovelace) {
      return;
    }

    const usedEntities = computeUsedEntities(this.lovelace);
    const unusedEntities = calcUnusedEntities(this.hass, usedEntities);

    this._usedEntities = [...usedEntities].filter(
      (eid) =>
        this.hass!.states[eid] &&
        !UNAVAILABLE_STATES.includes(this.hass!.states[eid].state)
    );
    this._unusedEntities = [...unusedEntities].filter(
      (eid) =>
        this.hass!.states[eid] &&
        !UNAVAILABLE_STATES.includes(this.hass!.states[eid].state)
    );

    this._loadCards();
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    // Store the width and height so that when we search, box doesn't jump
    const div = this.shadowRoot!.querySelector("div")!;
    if (!this._width) {
      const width = div.clientWidth;
      if (width) {
        this._width = width;
      }
    }
    if (!this._height) {
      const height = div.clientHeight;
      if (height) {
        this._height = height;
      }
    }
  }

  private _loadCards() {
    let cards: Card[] = coreCards.map((card: Card) => ({
      name: this.hass!.localize(
        `ui.panel.lovelace.editor.card.${card.type}.name`
      ),
      description: this.hass!.localize(
        `ui.panel.lovelace.editor.card.${card.type}.description`
      ),
      ...card,
    }));
    if (customCards.length > 0) {
      cards = cards.concat(
        customCards.map((ccard: CustomCardEntry) => ({
          type: ccard.type,
          name: ccard.name,
          description: ccard.description,
          showElement: ccard.preview,
          isCustom: true,
        }))
      );
    }
    this._cards = cards.map((card: Card) => ({
      card: card,
      element: html`${until(
        this._renderCardElement(card),
        html`
          <div class="card spinner">
            <paper-spinner active alt="Loading"></paper-spinner>
          </div>
        `
      )}`,
    }));
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
    this.requestUpdate();
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .cards-container {
          display: grid;
          grid-gap: 8px 8px;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          margin-top: 20px;
        }

        .card {
          height: 100%;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          border-radius: 4px;
          border: 1px solid var(--divider-color);
          background: var(--primary-background-color, #fafafa);
          cursor: pointer;
          box-sizing: border-box;
          position: relative;
        }

        .card-header {
          color: var(--ha-card-header-color, --primary-text-color);
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: 16px;
          letter-spacing: -0.012em;
          line-height: 20px;
          padding: 12px 16px;
          display: block;
          text-align: center;
          background: var(
            --ha-card-background,
            var(--paper-card-background-color, white)
          );
          border-radius: 0 0 4px 4px;
          border-top: 1px solid var(--divider-color);
        }

        .preview {
          pointer-events: none;
          margin: 20px;
          flex-grow: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview > :first-child {
          zoom: 0.6;
          display: block;
          width: 100%;
        }

        .description {
          text-align: center;
        }

        .spinner {
          align-items: center;
          justify-content: center;
        }

        .overlay {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        .manual {
          max-width: none;
        }
      `,
    ];
  }

  private _cardPicked(ev: Event): void {
    const config: LovelaceCardConfig = (ev.currentTarget! as CardPickTarget)
      .config;

    fireEvent(this, "config-changed", { config });
  }

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    const element = createCardElement(cardConfig) as LovelaceCard;
    element.hass = this.hass;
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
      cardElToReplace.parentElement!.replaceChild(newCardEl, cardElToReplace);
    }
  }

  private async _renderCardElement(card: Card): Promise<TemplateResult> {
    let { type } = card;
    const { showElement, isCustom, name, description } = card;
    const customCard = isCustom ? getCustomCardEntry(type) : undefined;
    if (isCustom) {
      type = `${CUSTOM_TYPE_PREFIX}${type}`;
    }

    let element: LovelaceCard | undefined;
    let cardConfig: LovelaceCardConfig = { type };

    if (this.hass && this.lovelace) {
      cardConfig = await getCardStubConfig(
        this.hass,
        type,
        this._unusedEntities!,
        this._usedEntities!
      );

      if (showElement) {
        element = this._createCardElement(cardConfig);
      }
    }

    return html`
      <div class="card">
        <div
          class="overlay"
          @click=${this._cardPicked}
          .config=${cardConfig}
        ></div>
        <div
          class="preview ${classMap({
            description: !element || element.tagName === "HUI-ERROR-CARD",
          })}"
        >
          ${element && element.tagName !== "HUI-ERROR-CARD"
            ? element
            : customCard
            ? customCard.description ||
              this.hass!.localize(
                `ui.panel.lovelace.editor.cardpicker.no_description`
              )
            : description}
        </div>
        <div class="card-header">
          ${customCard
            ? `${this.hass!.localize(
                "ui.panel.lovelace.editor.cardpicker.custom_card"
              )}: ${customCard.name || customCard.type}`
            : name}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-picker": HuiCardPicker;
  }
}
