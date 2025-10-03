import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { until } from "lit/directives/until";
import memoizeOne from "memoize-one";
import { storage } from "../../../../common/decorators/storage";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stringCompare } from "../../../../common/string/compare";
import "../../../../components/ha-spinner";
import "../../../../components/search-input";
import { isUnavailableState } from "../../../../data/entity";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { CustomCardEntry } from "../../../../data/lovelace_custom_cards";
import {
  CUSTOM_TYPE_PREFIX,
  customCards,
  getCustomCardEntry,
} from "../../../../data/lovelace_custom_cards";
import type { HomeAssistant } from "../../../../types";
import {
  calcUnusedEntities,
  computeUsedEntities,
} from "../../common/compute-unused-entities";
import { tryCreateCardElement } from "../../create-element/create-card-element";
import type { LovelaceCard } from "../../types";
import { getCardStubConfig } from "../get-card-stub-config";
import { coreCards } from "../lovelace-cards";
import type { Card, CardPickTarget } from "../types";

interface CardElement {
  card: Card;
  element: TemplateResult;
}

@customElement("hui-card-picker")
export class HuiCardPicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public suggestedCards?: string[];

  @state()
  @storage({
    key: "dashboardCardClipboard",
    state: true,
    subscribe: true,
    storage: "sessionStorage",
  })
  private _clipboard?: LovelaceCardConfig;

  @state() private _cards: CardElement[] = [];

  public lovelace?: LovelaceConfig;

  public cardPicked?: (cardConf: LovelaceCardConfig) => void;

  @state() private _filter = "";

  private _unusedEntities?: string[];

  private _usedEntities?: string[];

  public async focus(): Promise<void> {
    const searchInput = this.renderRoot.querySelector("search-input");
    if (searchInput) {
      searchInput.focus();
    } else {
      await this.updateComplete;
      this.focus();
    }
  }

  private _filterCards = memoizeOne(
    (cardElements: CardElement[], filter?: string): CardElement[] => {
      if (!filter) {
        return cardElements;
      }
      let cards = cardElements.map(
        (cardElement: CardElement) => cardElement.card
      );
      const options: IFuseOptions<Card> = {
        keys: ["type", "name", "description"],
        isCaseSensitive: false,
        minMatchCharLength: Math.min(filter.length, 2),
        threshold: 0.2,
        ignoreDiacritics: true,
      };
      const fuse = new Fuse(cards, options);
      cards = fuse.search(filter).map((result) => result.item);
      return cardElements.filter((cardElement: CardElement) =>
        cards.includes(cardElement.card)
      );
    }
  );

  private _suggestedCards = memoizeOne(
    (cardElements: CardElement[]): CardElement[] =>
      cardElements.filter(
        (cardElement: CardElement) => cardElement.card.isSuggested
      )
  );

  private _customCards = memoizeOne(
    (cardElements: CardElement[]): CardElement[] =>
      cardElements.filter(
        (cardElement: CardElement) =>
          cardElement.card.isCustom && !cardElement.card.isSuggested
      )
  );

  private _otherCards = memoizeOne(
    (cardElements: CardElement[]): CardElement[] =>
      cardElements.filter(
        (cardElement: CardElement) =>
          !cardElement.card.isSuggested && !cardElement.card.isCustom
      )
  );

  protected render() {
    if (
      !this.hass ||
      !this.lovelace ||
      !this._unusedEntities ||
      !this._usedEntities
    ) {
      return nothing;
    }

    const suggestedCards = this._suggestedCards(this._cards);
    const othersCards = this._otherCards(this._cards);
    const customCardsItems = this._customCards(this._cards);

    return html`
      <search-input
        .hass=${this.hass}
        .filter=${this._filter}
        @value-changed=${this._handleSearchChange}
        .label=${this.hass.localize(
          "ui.panel.lovelace.editor.edit_card.search_cards"
        )}
      ></search-input>
      <div id="content">
        ${this._filter
          ? html`<div class="cards-container">
              ${this._filterCards(this._cards, this._filter).map(
                (cardElement: CardElement) => cardElement.element
              )}
            </div>`
          : html`
              <div class="cards-container">
                ${suggestedCards.length > 0
                  ? html`
                      <div class="cards-container-header">
                        ${this.hass!.localize(
                          `ui.panel.lovelace.editor.card.generic.suggested_cards`
                        )}
                      </div>
                    `
                  : nothing}
                ${this._renderClipboardCard()}
                ${suggestedCards.map(
                  (cardElement: CardElement) => cardElement.element
                )}
              </div>
              <div class="cards-container">
                ${suggestedCards.length > 0
                  ? html`
                      <div class="cards-container-header">
                        ${this.hass!.localize(
                          `ui.panel.lovelace.editor.card.generic.other_cards`
                        )}
                      </div>
                    `
                  : nothing}
                ${othersCards.map(
                  (cardElement: CardElement) => cardElement.element
                )}
              </div>
              <div class="cards-container">
                ${customCardsItems.length > 0
                  ? html`
                      <div class="cards-container-header">
                        ${this.hass!.localize(
                          `ui.panel.lovelace.editor.card.generic.custom_cards`
                        )}
                      </div>
                    `
                  : nothing}
                ${customCardsItems.map(
                  (cardElement: CardElement) => cardElement.element
                )}
              </div>
            `}
        <div class="cards-container">
          <div
            class="card manual"
            @click=${this._cardPicked}
            .config=${{ type: "" }}
          >
            <div class="card-header">
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.card.generic.manual`
              )}
            </div>
            <div class="preview description">
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.card.generic.manual_description`
              )}
            </div>
            <ha-ripple></ha-ripple>
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

    if (oldHass.locale !== this.hass!.locale) {
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
        !isUnavailableState(this.hass!.states[eid].state)
    );
    this._unusedEntities = [...unusedEntities].filter(
      (eid) =>
        this.hass!.states[eid] &&
        !isUnavailableState(this.hass!.states[eid].state)
    );

    this._loadCards();
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("_filter")) {
      const div = this.parentElement!.shadowRoot!.getElementById("content");
      if (div) {
        div.scrollTo({ behavior: "auto", top: 0 });
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
      isSuggested: this.suggestedCards?.includes(card.type) || false,
      ...card,
    }));

    cards = cards.sort((a, b) => {
      if (a.isSuggested && !b.isSuggested) {
        return -1;
      }
      if (!a.isSuggested && b.isSuggested) {
        return 1;
      }
      return stringCompare(
        a.name || a.type,
        b.name || b.type,
        this.hass?.language
      );
    });

    if (customCards.length > 0) {
      cards = cards.concat(
        customCards
          .map((ccard: CustomCardEntry) => ({
            type: ccard.type,
            name: ccard.name,
            description: ccard.description,
            showElement: ccard.preview,
            isCustom: true,
          }))
          .sort((a, b) =>
            stringCompare(
              a.name || a.type,
              b.name || b.type,
              this.hass?.language
            )
          )
      );
    }
    this._cards = cards.map((card: Card) => ({
      card: card,
      element: html`${until(
        this._renderCardElement(card),
        html`
          <div class="card spinner">
            <ha-spinner></ha-spinner>
          </div>
        `
      )}`,
    }));
  }

  private _renderClipboardCard() {
    if (!this._clipboard) {
      return nothing;
    }

    return html` ${until(
      this._renderCardElement(
        {
          type: this._clipboard.type,
          showElement: true,
          isCustom: false,
          name: this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.paste"
          ),
          description: `${this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.paste_description",
            {
              type: this._clipboard.type,
            }
          )}`,
        },
        this._clipboard
      ),
      html`
        <div class="card spinner">
          <ha-spinner></ha-spinner>
        </div>
      `
    )}`;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _cardPicked(ev: Event): void {
    const config: LovelaceCardConfig = (ev.currentTarget! as CardPickTarget)
      .config;

    fireEvent(this, "config-changed", { config });
  }

  private _tryCreateCardElement(cardConfig: LovelaceCardConfig) {
    const element = tryCreateCardElement(cardConfig) as LovelaceCard;
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
    let newCardEl: LovelaceCard;
    try {
      newCardEl = this._tryCreateCardElement(config);
    } catch (_err: any) {
      return;
    }
    if (cardElToReplace.parentElement) {
      cardElToReplace.parentElement!.replaceChild(newCardEl, cardElToReplace);
    }
  }

  private async _renderCardElement(
    card: Card,
    config?: LovelaceCardConfig
  ): Promise<TemplateResult> {
    let { type } = card;
    const { showElement, isCustom, name, description } = card;
    const customCard = isCustom ? getCustomCardEntry(type) : undefined;
    if (isCustom) {
      type = `${CUSTOM_TYPE_PREFIX}${type}`;
    }

    let element: LovelaceCard | undefined;
    let cardConfig: LovelaceCardConfig = config ?? { type };

    if (this.hass && this.lovelace) {
      if (!config) {
        cardConfig = await getCardStubConfig(
          this.hass,
          type,
          this._unusedEntities!,
          this._usedEntities!
        );
      }

      if (showElement) {
        try {
          element = this._tryCreateCardElement(cardConfig);
        } catch (_err: any) {
          element = undefined;
        }
      }
    }

    // prevent tabbing to card
    if (element) {
      element.tabIndex = -1;
    }

    return html`
      <div class="card" tabindex="0">
        <div
          class="overlay"
          @click=${this._cardPicked}
          .config=${cardConfig}
        ></div>
        <div class="card-header">
          ${customCard ? customCard.name || customCard.type : name}
        </div>
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
        <ha-ripple></ha-ripple>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        search-input {
          display: block;
          --mdc-shape-small: var(--card-picker-search-shape);
          margin: var(--card-picker-search-margin);
          position: sticky;
          top: 0;
          z-index: 10;
          background-color: var(
              --ha-dialog-surface-background,
              var(--mdc-theme-surface, #fff)
          );
        }

        .cards-container-header {
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
          padding: 12px 8px;
          margin: 0;
          grid-column: 1 / -1;
          position: sticky;
          top: 56px;
          z-index: 1;
          background: linear-gradient(90deg, var(
                  --ha-dialog-surface-background,
                  var(--mdc-theme-surface, #fff)
          ) 0%, #ffffff00 80%);
        }

        .cards-container {
          display: grid;
          grid-gap: 8px 8px;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          margin-top: 20px;
        }

        .card {
          height: 100%;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
          background: var(--primary-background-color, #fafafa);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color));
        }

        .card-header {
          color: var(--ha-card-header-color, var(--primary-text-color));
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-bold);
          letter-spacing: -0.012em;
          line-height: var(--ha-line-height-condensed);
          padding: 12px 16px;
          display: block;
          text-align: center;
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
          box-sizing: border-box;
          border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
        }

        .manual {
          max-width: none;
          grid-column: 1 / -1;
        }

        .icon {
          position: absolute;
          top: 8px;
          right: 8px
          inset-inline-start: 8px;
          inset-inline-end: 8px;
          border-radius: var(--ha-border-radius-circle);
          --mdc-icon-size: 16px;
          line-height: 16px;
          box-sizing: border-box;
          color: var(--text-primary-color);
          padding: 4px;
        }
        .icon.custom {
          background: var(--warning-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-picker": HuiCardPicker;
  }
}
