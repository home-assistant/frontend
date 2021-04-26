import {
  customElement,
  internalProperty,
  property,
  PropertyValues,
  UpdatingElement,
} from "lit-element";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import "../../../components/entity/ha-state-label-badge";
import "../../../components/ha-svg-icon";
import type {
  LovelaceBadgeConfig,
  LovelaceCardConfig,
  LovelaceViewConfig,
  LovelaceViewElement,
} from "../../../data/lovelace";
import type { HomeAssistant } from "../../../types";
import type { HuiErrorCard } from "../cards/hui-error-card";
import { processConfigEntities } from "../common/process-config-entities";
import { createBadgeElement } from "../create-element/create-badge-element";
import { createCardElement } from "../create-element/create-card-element";
import { createViewElement } from "../create-element/create-view-element";
import { showCreateCardDialog } from "../editor/card-editor/show-create-card-dialog";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { confDeleteCard } from "../editor/delete-card";
import { generateLovelaceViewStrategy } from "../strategies/get-strategy";
import type { Lovelace, LovelaceBadge, LovelaceCard } from "../types";

const DEFAULT_VIEW_LAYOUT = "masonry";
const PANEL_VIEW_LAYOUT = "panel";

declare global {
  // for fire event
  interface HASSDomEvents {
    "ll-create-card": undefined;
    "ll-edit-card": { path: [number] | [number, number] };
    "ll-delete-card": { path: [number] | [number, number] };
  }
}

@customElement("hui-view")
export class HUIView extends UpdatingElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Number }) public index!: number;

  @internalProperty() private _cards: Array<LovelaceCard | HuiErrorCard> = [];

  @internalProperty() private _badges: LovelaceBadge[] = [];

  private _layoutElementType?: string;

  private _layoutElement?: LovelaceViewElement;

  private _viewConfigTheme?: string;

  // Public to make demo happy
  public createCardElement(cardConfig: LovelaceCardConfig) {
    const element = createCardElement(cardConfig) as LovelaceCard;
    element.hass = this.hass;
    element.addEventListener(
      "ll-rebuild",
      (ev: Event) => {
        // In edit mode let it go to hui-root and rebuild whole view.
        if (!this.lovelace!.editMode) {
          ev.stopPropagation();
          this._rebuildCard(element, cardConfig);
        }
      },
      { once: true }
    );
    return element;
  }

  public createBadgeElement(badgeConfig: LovelaceBadgeConfig) {
    const element = createBadgeElement(badgeConfig) as LovelaceBadge;
    element.hass = this.hass;
    element.addEventListener(
      "ll-badge-rebuild",
      () => {
        this._rebuildBadge(element, badgeConfig);
      },
      { once: true }
    );
    return element;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    /*
      We need to handle the following use cases:
       - initialization: create layout element, populate
       - config changed to view with same layout element
       - config changed to view with different layout element
       - forwarded properties hass/narrow/lovelace/cards/badges change
          - cards/badges change if one is rebuild when it was loaded later
          - lovelace changes if edit mode is enabled or config has changed
    */

    const oldLovelace = changedProperties.get("lovelace") as this["lovelace"];

    // If config has changed, create element if necessary and set all values.
    if (
      changedProperties.has("index") ||
      (changedProperties.has("lovelace") &&
        (!oldLovelace ||
          this.lovelace.config.views[this.index] !==
            oldLovelace.config.views[this.index]))
    ) {
      this._initializeConfig();
      return;
    }

    // If no layout element, we're still creating one
    if (this._layoutElement) {
      // Config has not changed. Just props
      if (changedProperties.has("hass")) {
        this._badges.forEach((badge) => {
          badge.hass = this.hass;
        });

        this._cards.forEach((element) => {
          element.hass = this.hass;
        });

        this._layoutElement.hass = this.hass;
      }
      if (changedProperties.has("narrow")) {
        this._layoutElement.narrow = this.narrow;
      }
      if (changedProperties.has("lovelace")) {
        this._layoutElement.lovelace = this.lovelace;
      }
      if (changedProperties.has("_cards")) {
        this._layoutElement.cards = this._cards;
      }
      if (changedProperties.has("_badges")) {
        this._layoutElement.badges = this._badges;
      }
    }

    const oldHass = changedProperties.get("hass") as this["hass"] | undefined;

    if (
      changedProperties.has("hass") &&
      (!oldHass ||
        this.hass.themes !== oldHass.themes ||
        this.hass.selectedTheme !== oldHass.selectedTheme)
    ) {
      applyThemesOnElement(this, this.hass.themes, this._viewConfigTheme);
    }
  }

  private async _initializeConfig() {
    let viewConfig = this.lovelace.config.views[this.index];
    let isStrategy = false;

    if (viewConfig.strategy) {
      isStrategy = true;
      viewConfig = await generateLovelaceViewStrategy({
        hass: this.hass,
        config: this.lovelace.config,
        narrow: this.narrow,
        view: viewConfig,
      });
    }

    viewConfig = {
      ...viewConfig,
      type: viewConfig.panel
        ? PANEL_VIEW_LAYOUT
        : viewConfig.type || DEFAULT_VIEW_LAYOUT,
    };

    // Create a new layout element if necessary.
    let addLayoutElement = false;

    if (!this._layoutElement || this._layoutElementType !== viewConfig.type) {
      addLayoutElement = true;
      this._createLayoutElement(viewConfig);
    }

    this._createBadges(viewConfig);
    this._createCards(viewConfig);
    this._layoutElement!.isStrategy = isStrategy;
    this._layoutElement!.hass = this.hass;
    this._layoutElement!.narrow = this.narrow;
    this._layoutElement!.lovelace = this.lovelace;
    this._layoutElement!.index = this.index;
    this._layoutElement!.cards = this._cards;
    this._layoutElement!.badges = this._badges;

    applyThemesOnElement(this, this.hass.themes, viewConfig.theme);
    this._viewConfigTheme = viewConfig.theme;

    if (addLayoutElement) {
      while (this.lastChild) {
        this.removeChild(this.lastChild);
      }
      this.appendChild(this._layoutElement!);
    }
  }

  private _createLayoutElement(config: LovelaceViewConfig): void {
    this._layoutElement = createViewElement(config) as LovelaceViewElement;
    this._layoutElementType = config.type;
    this._layoutElement.addEventListener("ll-create-card", () => {
      showCreateCardDialog(this, {
        lovelaceConfig: this.lovelace.config,
        saveConfig: this.lovelace.saveConfig,
        path: [this.index],
      });
    });
    this._layoutElement.addEventListener("ll-edit-card", (ev) => {
      showEditCardDialog(this, {
        lovelaceConfig: this.lovelace.config,
        saveConfig: this.lovelace.saveConfig,
        path: ev.detail.path,
      });
    });
    this._layoutElement.addEventListener("ll-delete-card", (ev) => {
      confDeleteCard(this, this.hass!, this.lovelace!, ev.detail.path);
    });
  }

  private _createBadges(config: LovelaceViewConfig): void {
    if (!config || !config.badges || !Array.isArray(config.badges)) {
      this._badges = [];
      return;
    }

    const badges = processConfigEntities(config.badges as any);
    this._badges = badges.map((badge) => {
      const element = createBadgeElement(badge);
      element.hass = this.hass;
      return element;
    });
  }

  private _createCards(config: LovelaceViewConfig): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      this._cards = [];
      return;
    }

    this._cards = config.cards.map((cardConfig) => {
      const element = this.createCardElement(cardConfig);
      element.hass = this.hass;
      return element;
    });
  }

  private _rebuildCard(
    cardElToReplace: LovelaceCard,
    config: LovelaceCardConfig
  ): void {
    const newCardEl = this.createCardElement(config);
    newCardEl.hass = this.hass;
    if (cardElToReplace.parentElement) {
      cardElToReplace.parentElement!.replaceChild(newCardEl, cardElToReplace);
    }
    this._cards = this._cards!.map((curCardEl) =>
      curCardEl === cardElToReplace ? newCardEl : curCardEl
    );
  }

  private _rebuildBadge(
    badgeElToReplace: LovelaceBadge,
    config: LovelaceBadgeConfig
  ): void {
    const newBadgeEl = this.createBadgeElement(config);
    newBadgeEl.hass = this.hass;
    if (badgeElToReplace.parentElement) {
      badgeElToReplace.parentElement!.replaceChild(
        newBadgeEl,
        badgeElToReplace
      );
    }
    this._badges = this._badges!.map((curBadgeEl) =>
      curBadgeEl === badgeElToReplace ? newBadgeEl : curBadgeEl
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view": HUIView;
  }
}
