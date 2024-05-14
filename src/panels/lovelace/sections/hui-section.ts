import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-svg-icon";
import type { LovelaceSectionElement } from "../../../data/lovelace";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import {
  LovelaceSectionConfig,
  LovelaceSectionRawConfig,
  isStrategySection,
} from "../../../data/lovelace/config/section";
import type { HomeAssistant } from "../../../types";
import type { HuiErrorCard } from "../cards/hui-error-card";
import { createCardElement } from "../create-element/create-card-element";
import {
  createErrorCardConfig,
  createErrorCardElement,
} from "../create-element/create-element-base";
import { createSectionElement } from "../create-element/create-section-element";
import { showCreateCardDialog } from "../editor/card-editor/show-create-card-dialog";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { deleteCard } from "../editor/config-util";
import { confDeleteCard } from "../editor/delete-card";
import { parseLovelaceCardPath } from "../editor/lovelace-path";
import { generateLovelaceSectionStrategy } from "../strategies/get-strategy";
import type { Lovelace, LovelaceCard } from "../types";
import { DEFAULT_SECTION_LAYOUT } from "./const";
import {
  Condition,
  checkConditionsMet,
  extractMediaQueries,
} from "../common/validate-condition";
import { deepEqual } from "../../../common/util/deep-equal";
import { listenMediaQuery } from "../../../common/dom/media_query";

@customElement("hui-section")
export class HuiSection extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public config!: LovelaceSectionRawConfig;

  @property({ type: Number }) public index!: number;

  @property({ type: Number }) public viewIndex!: number;

  @state() private _cards: Array<LovelaceCard | HuiErrorCard> = [];

  private _mediaQueriesListeners: Array<() => void> = [];

  private _mediaQueries: string[] = [];

  private _layoutElementType?: string;

  private _layoutElement?: LovelaceSectionElement;

  // Public to make demo happy
  public createCardElement(cardConfig: LovelaceCardConfig) {
    const element = createCardElement(cardConfig) as LovelaceCard;
    try {
      element.hass = this.hass;
    } catch (e: any) {
      return createErrorCardElement(
        createErrorCardConfig(e.message, cardConfig)
      );
    }
    element.addEventListener(
      "ll-rebuild",
      (ev: Event) => {
        // In edit mode let it go to hui-root and rebuild whole section.
        if (!this.lovelace!.editMode) {
          ev.stopPropagation();
          this._rebuildCard(element, cardConfig);
        }
      },
      { once: true }
    );
    return element;
  }

  protected createRenderRoot() {
    return this;
  }

  public willUpdate(changedProperties: PropertyValues<typeof this>): void {
    super.willUpdate(changedProperties);

    /*
      We need to handle the following use cases:
       - initialization: create layout element, populate
       - config changed to section with same layout element
       - config changed to section with different layout element
       - forwarded properties hass/narrow/lovelace/cards change
          - cards change if one is rebuild when it was loaded later
          - lovelace changes if edit mode is enabled or config has changed
    */

    const oldConfig = changedProperties.get("config");

    // If config has changed, create element if necessary and set all values.
    if (
      changedProperties.has("config") &&
      (!oldConfig || this.config !== oldConfig)
    ) {
      this._initializeConfig();
    } else {
      this._updateVisibility();
    }
  }

  protected update(changedProperties) {
    super.update(changedProperties);

    // If no layout element, we're still creating one
    if (this._layoutElement) {
      // Config has not changed. Just props
      if (changedProperties.has("hass")) {
        this._cards.forEach((element) => {
          try {
            element.hass = this.hass;
          } catch (e: any) {
            this._rebuildCard(element, createErrorCardConfig(e.message, null));
          }
        });

        this._layoutElement.hass = this.hass;
      }
      if (changedProperties.has("lovelace")) {
        this._layoutElement.lovelace = this.lovelace;
      }
      if (changedProperties.has("_cards")) {
        this._layoutElement.cards = this._cards;
      }
    }
  }

  private async _initializeConfig() {
    let sectionConfig = { ...this.config };
    let isStrategy = false;

    if (isStrategySection(sectionConfig)) {
      isStrategy = true;
      sectionConfig = await generateLovelaceSectionStrategy(
        sectionConfig.strategy,
        this.hass!
      );
    }

    sectionConfig = {
      ...sectionConfig,
      type: sectionConfig.type || DEFAULT_SECTION_LAYOUT,
    };

    // Create a new layout element if necessary.
    let addLayoutElement = false;

    if (
      !this._layoutElement ||
      this._layoutElementType !== sectionConfig.type
    ) {
      addLayoutElement = true;
      this._createLayoutElement(sectionConfig);
    }

    this._createCards(sectionConfig);
    this._layoutElement!.isStrategy = isStrategy;
    this._layoutElement!.hass = this.hass;
    this._layoutElement!.lovelace = this.lovelace;
    this._layoutElement!.index = this.index;
    this._layoutElement!.viewIndex = this.viewIndex;
    this._layoutElement!.cards = this._cards;

    if (addLayoutElement) {
      while (this.lastChild) {
        this.removeChild(this.lastChild);
      }
    }
    this._updateVisibility();
  }

  private _updateVisibility() {
    if (!this._layoutElement) {
      return;
    }

    const visibility =
      !this.config.visibility ||
      checkConditionsMet(this.config.visibility, this.hass!);

    this._setVisibility(visibility);
  }

  private _setVisibility(visilibity: boolean) {
    const element = this._layoutElement;
    if (!element) {
      return;
    }
    const visible = this.lovelace.editMode || visilibity;
    this.toggleAttribute("hidden", !visible);
    if (visible) {
      element.hass = this.hass;
      if (!element!.parentElement) {
        this.appendChild(element!);
      }
    } else if (element.parentElement) {
      this.removeChild(element!);
    }
  }

  private _createLayoutElement(config: LovelaceSectionConfig): void {
    this._layoutElement = createSectionElement(
      config
    ) as LovelaceSectionElement;
    this._layoutElementType = config.type;
    this._layoutElement.addEventListener("ll-create-card", (ev) => {
      ev.stopPropagation();
      showCreateCardDialog(this, {
        lovelaceConfig: this.lovelace.config,
        saveConfig: this.lovelace.saveConfig,
        path: [this.viewIndex, this.index],
        suggestedCards: ev.detail?.suggested,
      });
    });
    this._layoutElement.addEventListener("ll-edit-card", (ev) => {
      ev.stopPropagation();
      const { cardIndex } = parseLovelaceCardPath(ev.detail.path);
      showEditCardDialog(this, {
        lovelaceConfig: this.lovelace.config,
        saveConfig: this.lovelace.saveConfig,
        path: [this.viewIndex, this.index],
        cardIndex,
      });
    });
    this._layoutElement.addEventListener("ll-delete-card", (ev) => {
      ev.stopPropagation();
      if (ev.detail.confirm) {
        confDeleteCard(this, this.hass!, this.lovelace!, ev.detail.path);
      } else {
        const newLovelace = deleteCard(this.lovelace!.config, ev.detail.path);
        this.lovelace.saveConfig(newLovelace);
      }
    });
  }

  private _createCards(config: LovelaceSectionConfig): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      this._cards = [];
      return;
    }

    this._cards = config.cards.map((cardConfig) => {
      const element = this.createCardElement(cardConfig);
      try {
        element.hass = this.hass;
      } catch (e: any) {
        return createErrorCardElement(
          createErrorCardConfig(e.message, cardConfig)
        );
      }
      return element;
    });
  }

  private _rebuildCard(
    cardElToReplace: LovelaceCard,
    config: LovelaceCardConfig
  ): void {
    let newCardEl = this.createCardElement(config);
    try {
      newCardEl.hass = this.hass;
    } catch (e: any) {
      newCardEl = createErrorCardElement(
        createErrorCardConfig(e.message, config)
      );
    }
    if (cardElToReplace.parentElement) {
      cardElToReplace.parentElement!.replaceChild(newCardEl, cardElToReplace);
    }
    this._cards = this._cards!.map((curCardEl) =>
      curCardEl === cardElToReplace ? newCardEl : curCardEl
    );
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._clearMediaQueries();
  }

  public connectedCallback() {
    super.connectedCallback();
    this._listenMediaQueries();
    this._updateVisibility();
  }

  private _clearMediaQueries() {
    this._mediaQueries = [];
    while (this._mediaQueriesListeners.length) {
      this._mediaQueriesListeners.pop()!();
    }
  }

  private _listenMediaQueries() {
    if (!this.config.visibility) {
      return;
    }

    const mediaQueries = extractMediaQueries(
      this.config.visibility.filter((c) => "condition" in c) as Condition[]
    );

    if (deepEqual(mediaQueries, this._mediaQueries)) return;

    this._mediaQueries = mediaQueries;
    while (this._mediaQueriesListeners.length) {
      this._mediaQueriesListeners.pop()!();
    }

    mediaQueries.forEach((query) => {
      const listener = listenMediaQuery(query, (matches) => {
        // For performance, if there is only one condition and it's a screen condition, set the visibility directly
        if (
          this.config.visibility!.length === 1 &&
          "condition" in this.config.visibility![0] &&
          this.config.visibility![0].condition === "screen"
        ) {
          this._setVisibility(matches);
          return;
        }
        this._updateVisibility();
      });
      this._mediaQueriesListeners.push(listener);
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section": HuiSection;
  }
}
