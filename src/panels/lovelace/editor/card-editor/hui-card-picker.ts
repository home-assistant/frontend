import { mdiSort, mdiStar, mdiStarOutline } from "@mdi/js";
import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { createRef, ref } from "lit/directives/ref";
import { repeat } from "lit/directives/repeat";
import { until } from "lit/directives/until";
import memoizeOne from "memoize-one";
import { storage } from "../../../../common/decorators/storage";
import { PreserveScrollPositionController } from "../../../../common/controllers/preserve-scroll-position-controller";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { stringCompare } from "../../../../common/string/compare";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-ripple";
import "../../../../components/ha-spinner";
import "../../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../../components/input/ha-input-search";
import { UNAVAILABLE, UNKNOWN } from "../../../../data/entity/entity";
import { saveFrontendUserData } from "../../../../data/frontend";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { CustomCardEntry } from "../../../../data/lovelace_custom_cards";
import {
  CUSTOM_TYPE_PREFIX,
  customCards,
  getCustomCardEntry,
} from "../../../../data/lovelace_custom_cards";
import { haStyleScrollbar } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import {
  calcUnusedEntities,
  computeUsedEntities,
} from "../../common/compute-unused-entities";
import { tryCreateCardElement } from "../../create-element/create-card-element";
import type { LovelaceCard } from "../../types";
import { getCardStubConfig } from "../get-card-stub-config";
import { coreCards, energyCards } from "../lovelace-cards";
import type { Card, CardPickTarget } from "../types";
import { showReorderFavoriteCardsDialog } from "./show-reorder-favorite-cards-dialog";

interface CardElement {
  card: Card;
  element: TemplateResult;
}

const cardKey = (card: Card): string =>
  card.isCustom ? `${CUSTOM_TYPE_PREFIX}${card.type}` : card.type;

const SPINNER = html`<div class="spinner"><ha-spinner></ha-spinner></div>`;

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

  @state() private _favorites: string[] = [];

  public lovelace?: LovelaceConfig;

  public cardPicked?: (cardConf: LovelaceCardConfig) => void;

  @state() private _filter = "";

  @query("ha-input-search") private _searchInput?: HaInputSearch;

  @query("#content") private _content?: HTMLElement;

  private _unusedEntities?: string[];

  private _usedEntities?: string[];

  private _suggestedCards: CardElement[] = [];

  private _favoriteElements = new Map<string, CardElement>();

  private _topSection = createRef<HTMLElement>();

  public preserveScrollPosition = new PreserveScrollPositionController(
    this,
    this._topSection
  );

  public async focus(): Promise<void> {
    await this.updateComplete;
    // Wait for the input's inner wa-input to render so focus delegation works.
    await this._searchInput?.updateComplete;
    this._searchInput?.focus();
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
        ignoreLocation: true,
      };
      const fuse = new Fuse(cards, options);
      cards = fuse.search(filter).map((result) => result.item);
      return cardElements.filter((cardElement: CardElement) =>
        cards.includes(cardElement.card)
      );
    }
  );

  private _customCards = memoizeOne(
    (cardElements: CardElement[]): CardElement[] =>
      cardElements.filter(
        (cardElement: CardElement) => cardElement.card.isCustom
      )
  );

  private _otherCards = memoizeOne(
    (cardElements: CardElement[]): CardElement[] =>
      cardElements.filter(
        (cardElement: CardElement) =>
          !cardElement.card.isCustom && !cardElement.card.isEnergy
      )
  );

  private _energyCards = memoizeOne(
    (cardElements: CardElement[]): CardElement[] =>
      cardElements.filter(
        (cardElement: CardElement) => cardElement.card.isEnergy
      )
  );

  private _favoriteCards(): CardElement[] {
    return this._favorites
      .map((key) => this._favoriteElement(key))
      .filter((cardElement): cardElement is CardElement => !!cardElement);
  }

  // A preview is a live DOM node, so every section a card shows up in needs
  // its own element.
  private _toCardElement(card: Card): CardElement {
    return {
      card,
      element: html`${until(this._renderCardElement(card), SPINNER)}`,
    };
  }

  private _favoriteElement(key: string): CardElement | undefined {
    let cardElement = this._favoriteElements.get(key);
    if (!cardElement) {
      const card = this._cards.find((item) => cardKey(item.card) === key)?.card;
      if (!card) {
        return undefined;
      }
      cardElement = this._toCardElement(card);
      this._favoriteElements.set(key, cardElement);
    }
    return cardElement;
  }

  protected render() {
    if (
      !this.hass ||
      !this.lovelace ||
      !this._unusedEntities ||
      !this._usedEntities
    ) {
      return nothing;
    }

    const favoriteCards = this._favoriteCards();
    const suggestedCards = favoriteCards.length > 0 ? [] : this._suggestedCards;
    const othersCards = this._otherCards(this._cards);
    const energyCardsItems = this._energyCards(this._cards);
    const customCardsItems = this._customCards(this._cards);

    return html`
      <ha-input-search
        appearance="outlined"
        .value=${this._filter}
        @input=${this._handleSearchChange}
        .placeholder=${this.hass.localize(
          "ui.panel.lovelace.editor.edit_card.search_cards"
        )}
      ></ha-input-search>
      <div id="content" class="ha-scrollbar">
        ${
          this._filter
            ? html`<div class="cards-container">
                ${this._filterCards(this._cards, this._filter).map(
                  (cardElement: CardElement) => this._renderCard(cardElement)
                )}
              </div>`
            : html`
                <div ${ref(this._topSection)}>
                  ${
                    favoriteCards.length > 0
                      ? html`<ha-expansion-panel expanded>
                          <div slot="header" class="cards-container-header">
                            <span class="title"
                              >${this.hass!.localize(
                                `ui.panel.lovelace.editor.card.generic.favorite_cards`
                              )}</span
                            >
                            ${
                              favoriteCards.length > 1
                                ? html`<ha-icon-button
                                    class="reorder-favorites"
                                    .path=${mdiSort}
                                    .label=${this.hass!.localize(
                                      `ui.panel.lovelace.editor.card.generic.reorder_favorites`
                                    )}
                                    @click=${this._reorderFavorites}
                                  ></ha-icon-button>`
                                : nothing
                            }
                          </div>
                          <div class="cards-container">
                            ${this._renderClipboardCard(this._clipboard, this.hass!.locale)}
                            ${repeat(
                              favoriteCards,
                              (cardElement: CardElement) =>
                                cardKey(cardElement.card),
                              (cardElement: CardElement) =>
                                this._renderCard(cardElement)
                            )}
                          </div>
                        </ha-expansion-panel>`
                      : nothing
                  }
                  ${
                    suggestedCards.length > 0
                      ? html`<ha-expansion-panel expanded>
                          <div slot="header" class="cards-container-header">
                            <span class="title"
                              >${this.hass!.localize(
                                `ui.panel.lovelace.editor.card.generic.suggested_cards`
                              )}</span
                            >
                          </div>
                          <div class="cards-container">
                            ${
                              favoriteCards.length === 0
                                ? this._renderClipboardCard(
                                    this._clipboard,
                                    this.hass!.locale
                                  )
                                : nothing
                            }
                            ${suggestedCards.map((cardElement: CardElement) =>
                              this._renderCard(cardElement)
                            )}
                          </div>
                        </ha-expansion-panel>`
                      : nothing
                  }
                </div>
                <ha-expansion-panel expanded>
                  <div slot="header" class="cards-container-header">
                    <span class="title"
                      >${this.hass!.localize(
                        `ui.panel.lovelace.editor.card.generic.core_cards`
                      )}</span
                    >
                  </div>
                  <div class="cards-container">
                    ${
                      favoriteCards.length === 0 && suggestedCards.length === 0
                        ? this._renderClipboardCard(
                            this._clipboard,
                            this.hass!.locale
                          )
                        : nothing
                    }
                    ${othersCards.map((cardElement: CardElement) =>
                      this._renderCard(cardElement)
                    )}
                  </div>
                </ha-expansion-panel>
                <ha-expansion-panel>
                  <div slot="header" class="cards-container-header">
                    <span class="title"
                      >${this.hass!.localize(
                        `ui.panel.lovelace.editor.card.generic.energy_cards`
                      )}</span
                    >
                  </div>
                  <div class="cards-container">
                    ${energyCardsItems.map((cardElement: CardElement) =>
                      this._renderCard(cardElement)
                    )}
                  </div>
                </ha-expansion-panel>
                ${
                  customCardsItems.length > 0
                    ? html`
                        <ha-expansion-panel expanded>
                          <div slot="header" class="cards-container-header">
                            <span class="title"
                              >${this.hass!.localize(
                                `ui.panel.lovelace.editor.card.generic.custom_cards`
                              )}</span
                            >
                          </div>
                          <div class="cards-container">
                            ${customCardsItems.map((cardElement: CardElement) =>
                              this._renderCard(cardElement)
                            )}
                          </div>
                        </ha-expansion-panel>
                      `
                    : nothing
                }
              `
        }
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

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
    if (changedProps.size > 1 || !changedProps.has("hass")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    return !oldHass || oldHass.locale !== this.hass!.locale;
  }

  protected firstUpdated(): void {
    if (!this.hass || !this.lovelace) {
      return;
    }

    const usedEntities = computeUsedEntities(this.lovelace);
    const unusedEntities = calcUnusedEntities(this.hass, usedEntities);

    const isAvailable = (eid: string) => {
      const stateObj = this.hass!.states[eid];
      return (
        stateObj && stateObj.state !== UNAVAILABLE && stateObj.state !== UNKNOWN
      );
    };
    this._usedEntities = [...usedEntities].filter(isAvailable);
    this._unusedEntities = [...unusedEntities].filter(isAvailable);

    this._favorites = this.hass.userData?.dashboard_favorite_card_types ?? [];

    this._loadCards();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_filter")) {
      this._content?.scrollTo({ behavior: "auto", top: 0 });
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

    cards = cards.sort((a, b) =>
      stringCompare(a.name || a.type, b.name || b.type, this.hass?.language)
    );

    cards = cards.concat(
      energyCards.map((card: Card) => ({
        name: this.hass!.localize(
          `ui.panel.lovelace.editor.card.${card.type}.name`
        ),
        description: this.hass!.localize(
          `ui.panel.lovelace.editor.card.${card.type}.description`
        ),
        isEnergy: true,
        ...card,
      }))
    );

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
    this._cards = cards.map((card: Card) => this._toCardElement(card));
    this._suggestedCards = cards
      .filter((card: Card) => card.isSuggested)
      .map((card: Card) => this._toCardElement(card));
  }

  private _renderClipboardCard = memoizeOne(
    (clipboard: LovelaceCardConfig | undefined, _locale: unknown) => {
      if (!clipboard) {
        return nothing;
      }

      return html`<div class="card" tabindex="0">
        ${until(
          this._renderCardElement(
            {
              type: clipboard.type,
              showElement: true,
              isCustom: false,
              name: this.hass!.localize(
                "ui.panel.lovelace.editor.card.generic.paste"
              ),
              description: `${this.hass!.localize(
                "ui.panel.lovelace.editor.card.generic.paste_description",
                {
                  type: clipboard.type,
                }
              )}`,
            },
            clipboard
          ),
          SPINNER
        )}
        <ha-ripple></ha-ripple>
      </div>`;
    }
  );

  private _renderCard(cardElement: CardElement): TemplateResult {
    const key = cardKey(cardElement.card);
    const favorite = this._favorites.includes(key);

    return html`
      <div class="card" tabindex="0">
        ${cardElement.element}
        <ha-icon-button
          class="favorite ${classMap({ selected: favorite })}"
          .path=${favorite ? mdiStar : mdiStarOutline}
          .label=${this.hass!.localize(
            favorite
              ? "ui.panel.lovelace.editor.card.generic.remove_favorite"
              : "ui.panel.lovelace.editor.card.generic.add_favorite"
          )}
          data-card=${key}
          @click=${this._toggleFavorite}
          @pointerdown=${stopPropagation}
        ></ha-icon-button>
        <ha-ripple></ha-ripple>
      </div>
    `;
  }

  private _setFavorite(key: string, value: boolean): void {
    const favorites = this._favorites.filter((favorite) => favorite !== key);
    this._favorites = value ? [...favorites, key] : favorites;
  }

  private async _toggleFavorite(ev: Event): Promise<void> {
    ev.stopPropagation();
    const key = (ev.currentTarget as HTMLElement).dataset.card!;

    const adding = !this._favorites.includes(key);
    this._setFavorite(key, adding);

    try {
      await this._persistFavorites();
    } catch (_err: any) {
      this._setFavorite(key, !adding);
      this._showSaveError();
    }
  }

  private _reorderFavorites(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();

    showReorderFavoriteCardsDialog(this, {
      favorites: this._favoriteCards().map((cardElement) => ({
        key: cardKey(cardElement.card),
        name: cardElement.card.name || cardElement.card.type,
      })),
      saveFavorites: (favorites) => this._saveFavorites(favorites),
    });
  }

  private async _saveFavorites(favorites: string[]): Promise<void> {
    const previous = this._favorites;
    this._favorites = favorites;

    try {
      await this._persistFavorites();
    } catch (_err: any) {
      this._favorites = previous;
      this._showSaveError();
    }
  }

  private _persistFavorites(): Promise<void> {
    return saveFrontendUserData(this.hass!.connection, "core", {
      ...this.hass!.userData,
      dashboard_favorite_card_types: this._favorites,
    });
  }

  private _showSaveError(): void {
    showToast(this, {
      message: this.hass!.localize(
        "ui.panel.lovelace.editor.card.generic.favorite_save_failed"
      ),
    });
  }

  private _handleSearchChange(ev: Event) {
    this._filter = (ev.target as HaInputSearch).value ?? "";
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
        ${
          element && element.tagName !== "HUI-ERROR-CARD"
            ? element
            : customCard
              ? customCard.description ||
                this.hass!.localize(
                  `ui.panel.lovelace.editor.cardpicker.no_description`
                )
              : description
        }
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        #content {
          flex: 1;
          min-height: 0;
          overflow: auto;
        }

        ha-input-search {
          padding: var(--ha-space-3) var(--ha-space-3) 0;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .cards-container-header {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          min-width: 0;
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
          padding: var(--ha-space-3) var(--ha-space-2);
          margin: 0;
          grid-column: 1 / -1;
          position: sticky;
          top: 0;
          z-index: 1;
          background: linear-gradient(
            90deg,
            var(--ha-dialog-surface-background, var(--mdc-theme-surface, #fff))
              0%,
            #ffffff00 80%
          );
        }

        .cards-container {
          display: grid;
          gap: var(--ha-space-2);
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          padding: var(--ha-space-3);
        }

        .card {
          height: 100%;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          border-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          background: var(--primary-background-color, #fafafa);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          border: var(--ha-card-border-width, 1px) solid
            var(--ha-card-border-color, var(--divider-color));
        }

        .card-header {
          color: var(--ha-card-header-color, var(--primary-text-color));
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-bold);
          letter-spacing: -0.012em;
          line-height: var(--ha-line-height-condensed);
          padding: var(--ha-space-3) var(--ha-space-11);
          display: block;
          text-align: center;
        }

        .cards-container-header .title {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reorder-favorites {
          flex: none;
          margin-inline-start: auto;
          /* Keeps the hit area without growing the header row */
          margin-block: calc(-1 * var(--ha-space-1));
          --ha-icon-button-size: var(--ha-space-8);
          --mdc-icon-size: var(--ha-space-5);
          color: var(--secondary-text-color);
        }

        .favorite {
          position: absolute;
          top: var(--ha-space-1);
          inset-inline-end: var(--ha-space-1);
          z-index: 2;
          color: var(--secondary-text-color);
          opacity: 0;
          transition: opacity var(--ha-animation-duration-fast) ease-in-out;
          --ha-icon-button-size: var(--ha-space-10);
        }

        .card:hover .favorite,
        .card:focus-within .favorite,
        .favorite.selected {
          opacity: 1;
        }

        .favorite.selected {
          color: var(--primary-color);
        }

        @media (hover: none) {
          .favorite {
            opacity: 1;
          }
        }

        .preview {
          pointer-events: none;
          margin: var(--ha-space-5);
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
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .overlay {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 1;
          box-sizing: border-box;
          border-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
        }

        .manual {
          max-width: none;
          grid-column: 1 / -1;
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
