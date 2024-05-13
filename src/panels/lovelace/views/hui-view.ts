import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-state-label-badge";
import "../../../components/ha-svg-icon";
import type { LovelaceViewElement } from "../../../data/lovelace";
import { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import {
  LovelaceViewConfig,
  isStrategyView,
} from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import {
  createErrorBadgeConfig,
  createErrorBadgeElement,
} from "../badges/hui-error-badge";
import type { HuiErrorCard } from "../cards/hui-error-card";
import { processConfigEntities } from "../common/process-config-entities";
import { createBadgeElement } from "../create-element/create-badge-element";
import { createCardElement } from "../create-element/create-card-element";
import {
  createErrorCardConfig,
  createErrorCardElement,
} from "../create-element/create-element-base";
import { createViewElement } from "../create-element/create-view-element";
import { showCreateCardDialog } from "../editor/card-editor/show-create-card-dialog";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { deleteCard } from "../editor/config-util";
import { confDeleteCard } from "../editor/delete-card";
import {
  LovelaceCardPath,
  parseLovelaceCardPath,
} from "../editor/lovelace-path";
import { createErrorSectionConfig } from "../sections/hui-error-section";
import "../sections/hui-section";
import type { HuiSection } from "../sections/hui-section";
import { generateLovelaceViewStrategy } from "../strategies/get-strategy";
import type { Lovelace, LovelaceBadge, LovelaceCard } from "../types";
import { DEFAULT_VIEW_LAYOUT, PANEL_VIEW_LAYOUT } from "./const";

declare global {
  // for fire event
  interface HASSDomEvents {
    "ll-create-card": { suggested?: string[] } | undefined;
    "ll-edit-card": { path: LovelaceCardPath };
    "ll-delete-card": { path: LovelaceCardPath; confirm: boolean };
  }
  interface HTMLElementEventMap {
    "ll-create-card": HASSDomEvent<HASSDomEvents["ll-create-card"]>;
    "ll-edit-card": HASSDomEvent<HASSDomEvents["ll-edit-card"]>;
    "ll-delete-card": HASSDomEvent<HASSDomEvents["ll-delete-card"]>;
  }
}

@customElement("hui-view")
export class HUIView extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Number }) public index!: number;

  @state() private _cards: Array<LovelaceCard | HuiErrorCard> = [];

  @state() private _badges: LovelaceBadge[] = [];

  @state() private _sections: HuiSection[] = [];

  private _layoutElementType?: string;

  private _layoutElement?: LovelaceViewElement;

  private _viewConfigTheme?: string;

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
    try {
      element.hass = this.hass;
    } catch (e: any) {
      return createErrorBadgeElement(createErrorBadgeConfig(e.message));
    }
    element.addEventListener(
      "ll-badge-rebuild",
      () => {
        this._rebuildBadge(element, badgeConfig);
      },
      { once: true }
    );
    return element;
  }

  // Public to make demo happy
  public createSectionElement(sectionConfig: LovelaceSectionConfig) {
    const element = document.createElement("hui-section");
    element.hass = this.hass;
    element.lovelace = this.lovelace;
    element.config = sectionConfig;
    element.viewIndex = this.index;
    element.addEventListener(
      "ll-rebuild",
      (ev: Event) => {
        // In edit mode let it go to hui-root and rebuild whole view.
        if (!this.lovelace!.editMode) {
          ev.stopPropagation();
          this._rebuildSection(element, sectionConfig);
        }
      },
      { once: true }
    );
    return element;
  }

  protected createRenderRoot() {
    return this;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._applyTheme();
  }

  public willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

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
    }
  }

  protected update(changedProperties: PropertyValues) {
    super.update(changedProperties);

    // If no layout element, we're still creating one
    if (this._layoutElement) {
      // Config has not changed. Just props
      if (changedProperties.has("hass")) {
        this._badges.forEach((badge) => {
          try {
            badge.hass = this.hass;
          } catch (e: any) {
            this._rebuildBadge(badge, createErrorBadgeConfig(e.message));
          }
        });

        this._cards.forEach((element) => {
          try {
            element.hass = this.hass;
          } catch (e: any) {
            this._rebuildCard(element, createErrorCardConfig(e.message, null));
          }
        });

        this._sections.forEach((element) => {
          try {
            element.hass = this.hass;
          } catch (e: any) {
            this._rebuildSection(element, createErrorSectionConfig(e.message));
          }
        });

        this._layoutElement.hass = this.hass;

        const oldHass = changedProperties.get("hass") as
          | this["hass"]
          | undefined;

        if (
          !oldHass ||
          this.hass.themes !== oldHass.themes ||
          this.hass.selectedTheme !== oldHass.selectedTheme
        ) {
          this._applyTheme();
        }
      }
      if (changedProperties.has("narrow")) {
        this._layoutElement.narrow = this.narrow;
      }
      if (changedProperties.has("lovelace")) {
        this._layoutElement.lovelace = this.lovelace;
        this._sections.forEach((element) => {
          try {
            element.hass = this.hass;
            element.lovelace = this.lovelace;
          } catch (e: any) {
            this._rebuildSection(element, createErrorSectionConfig(e.message));
          }
        });
      }
      if (changedProperties.has("_cards")) {
        this._layoutElement.cards = this._cards;
      }
      if (changedProperties.has("_badges")) {
        this._layoutElement.badges = this._badges;
      }
    }
  }

  private _applyTheme() {
    applyThemesOnElement(this, this.hass.themes, this._viewConfigTheme);
    if (this._viewConfigTheme) {
      // Set lovelace background color to root element, so it will be placed under the header too
      const computedStyles = getComputedStyle(this);
      let lovelaceBackground = computedStyles.getPropertyValue(
        "--lovelace-background"
      );
      if (!lovelaceBackground) {
        lovelaceBackground = computedStyles.getPropertyValue(
          "--primary-background-color"
        );
      }
      if (lovelaceBackground) {
        this.parentElement?.style.setProperty(
          "--lovelace-background",
          lovelaceBackground
        );
      }
    }
  }

  private async _initializeConfig() {
    let viewConfig = this.lovelace.config.views[this.index];
    let isStrategy = false;

    if (isStrategyView(viewConfig)) {
      isStrategy = true;
      viewConfig = await generateLovelaceViewStrategy(
        viewConfig.strategy,
        this.hass!
      );
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
    this._createSections(viewConfig);
    this._layoutElement!.isStrategy = isStrategy;
    this._layoutElement!.hass = this.hass;
    this._layoutElement!.narrow = this.narrow;
    this._layoutElement!.lovelace = this.lovelace;
    this._layoutElement!.index = this.index;
    this._layoutElement!.cards = this._cards;
    this._layoutElement!.badges = this._badges;
    this._layoutElement!.sections = this._sections;

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
    this._layoutElement.addEventListener("ll-create-card", (ev) => {
      showCreateCardDialog(this, {
        lovelaceConfig: this.lovelace.config,
        saveConfig: this.lovelace.saveConfig,
        path: [this.index],
        suggestedCards: ev.detail?.suggested,
      });
    });
    this._layoutElement.addEventListener("ll-edit-card", (ev) => {
      const { cardIndex } = parseLovelaceCardPath(ev.detail.path);
      showEditCardDialog(this, {
        lovelaceConfig: this.lovelace.config,
        saveConfig: this.lovelace.saveConfig,
        path: [this.index],
        cardIndex,
      });
    });
    this._layoutElement.addEventListener("ll-delete-card", (ev) => {
      if (ev.detail.confirm) {
        confDeleteCard(this, this.hass!, this.lovelace!, ev.detail.path);
      } else {
        const newLovelace = deleteCard(this.lovelace!.config, ev.detail.path);
        this.lovelace.saveConfig(newLovelace);
      }
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
      try {
        element.hass = this.hass;
      } catch (e: any) {
        return createErrorBadgeElement(createErrorBadgeConfig(e.message));
      }
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

  private _createSections(config: LovelaceViewConfig): void {
    if (!config || !config.sections || !Array.isArray(config.sections)) {
      this._sections = [];
      return;
    }

    this._sections = config.sections.map((sectionConfig, index) => {
      const element = this.createSectionElement(sectionConfig);
      element.index = index;
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

  private _rebuildBadge(
    badgeElToReplace: LovelaceBadge,
    config: LovelaceBadgeConfig
  ): void {
    let newBadgeEl = this.createBadgeElement(config);
    try {
      newBadgeEl.hass = this.hass;
    } catch (e: any) {
      newBadgeEl = createErrorBadgeElement(createErrorBadgeConfig(e.message));
    }
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

  private _rebuildSection(
    sectionElToReplace: HuiSection,
    config: LovelaceSectionConfig
  ): void {
    const newSectionEl = this.createSectionElement(config);
    newSectionEl.index = sectionElToReplace.index;
    if (sectionElToReplace.parentElement) {
      sectionElToReplace.parentElement!.replaceChild(
        newSectionEl,
        sectionElToReplace
      );
    }
    this._sections = this._sections!.map((curSectionEl) =>
      curSectionEl === sectionElToReplace ? newSectionEl : curSectionEl
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view": HUIView;
  }
}
