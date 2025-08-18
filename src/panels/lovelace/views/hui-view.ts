import deepClone from "deep-clone-simple";
import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { storage } from "../../../common/decorators/storage";
import { fireEvent, type HASSDomEvent } from "../../../common/dom/fire_event";
import { debounce } from "../../../common/util/debounce";
import { deepEqual } from "../../../common/util/deep-equal";
import "../../../components/entity/ha-state-label-badge";
import "../../../components/ha-svg-icon";
import type { LovelaceViewElement } from "../../../data/lovelace";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import { ensureBadgeConfig } from "../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type {
  LovelaceViewConfig,
  LovelaceViewRawConfig,
} from "../../../data/lovelace/config/view";
import { isStrategyView } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import "../badges/hui-badge";
import type { HuiBadge } from "../badges/hui-badge";
import "../cards/hui-card";
import type { HuiCard } from "../cards/hui-card";
import { createViewElement } from "../create-element/create-view-element";
import { showCreateBadgeDialog } from "../editor/badge-editor/show-create-badge-dialog";
import { showEditBadgeDialog } from "../editor/badge-editor/show-edit-badge-dialog";
import { showCreateCardDialog } from "../editor/card-editor/show-create-card-dialog";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { addCard, replaceCard } from "../editor/config-util";
import {
  type DeleteBadgeParams,
  performDeleteBadge,
} from "../editor/delete-badge";
import {
  type DeleteCardParams,
  performDeleteCard,
} from "../editor/delete-card";
import type { LovelaceCardPath } from "../editor/lovelace-path";
import { parseLovelaceCardPath } from "../editor/lovelace-path";
import { createErrorSectionConfig } from "../sections/hui-error-section";
import "../sections/hui-section";
import type { HuiSection } from "../sections/hui-section";
import { generateLovelaceViewStrategy } from "../strategies/get-strategy";
import type { Lovelace } from "../types";
import { getViewType } from "./get-view-type";

declare global {
  // for fire event
  interface HASSDomEvents {
    "ll-create-card": { suggested?: string[] } | undefined;
    "ll-edit-card": { path: LovelaceCardPath };
    "ll-delete-card": DeleteCardParams;
    "ll-duplicate-card": { path: LovelaceCardPath };
    "ll-copy-card": { path: LovelaceCardPath };
    "ll-create-badge": undefined;
    "ll-edit-badge": { path: LovelaceCardPath };
    "ll-delete-badge": DeleteBadgeParams;
  }
  interface HTMLElementEventMap {
    "ll-create-card": HASSDomEvent<HASSDomEvents["ll-create-card"]>;
    "ll-edit-card": HASSDomEvent<HASSDomEvents["ll-edit-card"]>;
    "ll-delete-card": HASSDomEvent<HASSDomEvents["ll-delete-card"]>;
    "ll-duplicate-card": HASSDomEvent<HASSDomEvents["ll-duplicate-card"]>;
    "ll-copy-card": HASSDomEvent<HASSDomEvents["ll-copy-card"]>;
    "ll-create-badge": HASSDomEvent<HASSDomEvents["ll-create-badge"]>;
    "ll-edit-badge": HASSDomEvent<HASSDomEvents["ll-edit-badge"]>;
    "ll-delete-badge": HASSDomEvent<HASSDomEvents["ll-delete-badge"]>;
  }
}

@customElement("hui-view")
export class HUIView extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Number }) public index!: number;

  @property({ attribute: false }) public allowEdit = false;

  @state() private _cards: HuiCard[] = [];

  @state() private _badges: HuiBadge[] = [];

  @state() private _sections: HuiSection[] = [];

  private _layoutElementType?: string;

  private _layoutElement?: LovelaceViewElement;

  private _layoutElementConfig?: LovelaceViewConfig;

  private _rendered = false;

  @storage({
    key: "dashboardCardClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: LovelaceCardConfig;

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    const element = document.createElement("hui-card");
    element.hass = this.hass;
    element.preview = this.allowEdit && this.lovelace.editMode;
    element.config = cardConfig;
    element.addEventListener("card-updated", (ev: Event) => {
      ev.stopPropagation();
      this._cards = [...this._cards];
    });
    element.load();
    return element;
  }

  public createBadgeElement(badgeConfig: LovelaceBadgeConfig) {
    const element = document.createElement("hui-badge");
    element.hass = this.hass;
    element.preview = this.allowEdit && this.lovelace.editMode;
    element.config = badgeConfig;
    element.addEventListener("badge-updated", (ev: Event) => {
      ev.stopPropagation();
      this._badges = [...this._badges];
    });
    element.load();
    return element;
  }

  // Public to make demo happy
  public createSectionElement(sectionConfig: LovelaceSectionConfig) {
    const viewConfig = this.lovelace.config.views[this.index];
    const element = document.createElement("hui-section");
    element.hass = this.hass;
    element.lovelace = this.lovelace;
    element.config = sectionConfig;
    element.viewIndex = this.index;
    element.allowEdit = this.allowEdit && !isStrategyView(viewConfig);
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

  connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => {
      this._rendered = true;
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._rendered = false;
  }

  public willUpdate(changedProperties: PropertyValues<typeof this>): void {
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

    const oldLovelace = changedProperties.get("lovelace");

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

    if (!changedProperties.has("hass")) {
      return;
    }

    const oldHass = changedProperties.get("hass") as HomeAssistant | undefined;
    const viewConfig = this.lovelace.config.views[this.index];
    if (oldHass && this.hass && this.lovelace && isStrategyView(viewConfig)) {
      if (
        oldHass.entities !== this.hass.entities ||
        oldHass.devices !== this.hass.devices ||
        oldHass.areas !== this.hass.areas ||
        oldHass.floors !== this.hass.floors
      ) {
        if (this.hass.config.state === "RUNNING") {
          // If the page is not rendered yet, we can force the refresh
          if (this._rendered) {
            this._debounceRefreshConfig(false);
          } else {
            this._refreshConfig(true);
          }
        }
      }
    }
  }

  private _debounceRefreshConfig = debounce(
    (force: boolean) => this._refreshConfig(force),
    200
  );

  private _refreshConfig = async (force: boolean) => {
    if (!this.hass || !this.lovelace) {
      return;
    }
    const viewConfig = this.lovelace.config.views[this.index];

    if (!isStrategyView(viewConfig)) {
      return;
    }

    const oldConfig = this._layoutElementConfig;
    const newConfig = await this._generateConfig(viewConfig);

    // Don't ask if the config is the same
    if (!deepEqual(newConfig, oldConfig)) {
      if (force) {
        this._setConfig(newConfig, true);
      } else {
        fireEvent(this, "strategy-config-changed");
      }
    }
  };

  protected update(changedProperties: PropertyValues) {
    super.update(changedProperties);

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

        this._sections.forEach((element) => {
          try {
            element.hass = this.hass;
          } catch (e: any) {
            this._rebuildSection(element, createErrorSectionConfig(e.message));
          }
        });

        this._layoutElement.hass = this.hass;
      }
      if (changedProperties.has("narrow")) {
        this._layoutElement.narrow = this.narrow;
      }
      if (changedProperties.has("lovelace")) {
        this._layoutElement.lovelace = this.lovelace;
      }
      if (
        changedProperties.has("lovelace") ||
        changedProperties.has("allowEdit")
      ) {
        const preview = this.allowEdit && this.lovelace.editMode;
        this._sections.forEach((element) => {
          try {
            element.hass = this.hass;
            element.lovelace = this.lovelace;
            element.preview = preview;
          } catch (e: any) {
            this._rebuildSection(element, createErrorSectionConfig(e.message));
          }
        });
        this._cards.forEach((element) => {
          element.preview = preview;
        });
        this._badges.forEach((element) => {
          element.preview = preview;
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

  private async _generateConfig(
    config: LovelaceViewRawConfig
  ): Promise<LovelaceViewConfig> {
    if (isStrategyView(config)) {
      const generatedConfig = await generateLovelaceViewStrategy(
        config,
        this.hass!
      );
      return {
        ...generatedConfig,
        type: getViewType(generatedConfig),
      };
    }

    return {
      ...config,
      type: getViewType(config),
    };
  }

  private async _setConfig(
    viewConfig: LovelaceViewConfig,
    isStrategy: boolean
  ) {
    // Create a new layout element if necessary.
    let addLayoutElement = false;

    if (!this._layoutElement || this._layoutElementType !== viewConfig.type) {
      addLayoutElement = true;
      this._createLayoutElement(viewConfig);
    }
    this._layoutElementConfig = viewConfig;
    this._createBadges(viewConfig);
    this._createCards(viewConfig);
    this._createSections(viewConfig);
    this._layoutElement!.isStrategy = isStrategy;
    this._layoutElement!.allowEdit = this.allowEdit && !isStrategy;
    this._layoutElement!.hass = this.hass;
    this._layoutElement!.narrow = this.narrow;
    this._layoutElement!.lovelace = this.lovelace;
    this._layoutElement!.index = this.index;
    this._layoutElement!.cards = this._cards;
    this._layoutElement!.badges = this._badges;
    this._layoutElement!.sections = this._sections;

    if (addLayoutElement) {
      while (this.lastChild) {
        this.removeChild(this.lastChild);
      }
      this.appendChild(this._layoutElement!);
    }
  }

  private async _initializeConfig() {
    const rawConfig = this.lovelace.config.views[this.index];

    const viewConfig = await this._generateConfig(rawConfig);
    const isStrategy = isStrategyView(rawConfig);

    this._setConfig(viewConfig, isStrategy);
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
      const viewConfig = this.lovelace!.config.views[this.index];
      if (isStrategyView(viewConfig)) {
        return;
      }
      const cardConfig = viewConfig.cards![cardIndex];
      showEditCardDialog(this, {
        lovelaceConfig: this.lovelace.config,
        saveCardConfig: async (newCardConfig) => {
          const newConfig = replaceCard(
            this.lovelace!.config,
            [this.index, cardIndex],
            newCardConfig
          );
          await this.lovelace.saveConfig(newConfig);
        },
        cardConfig,
      });
    });
    this._layoutElement.addEventListener("ll-delete-card", (ev) => {
      if (!this.lovelace) return;
      performDeleteCard(this.hass, this.lovelace, ev.detail);
    });
    this._layoutElement.addEventListener("ll-create-badge", async () => {
      showCreateBadgeDialog(this, {
        lovelaceConfig: this.lovelace.config,
        saveConfig: this.lovelace.saveConfig,
        path: [this.index],
      });
    });
    this._layoutElement.addEventListener("ll-edit-badge", (ev) => {
      const { cardIndex } = parseLovelaceCardPath(ev.detail.path);
      showEditBadgeDialog(this, {
        lovelaceConfig: this.lovelace.config,
        saveConfig: this.lovelace.saveConfig,
        path: [this.index],
        badgeIndex: cardIndex,
      });
    });
    this._layoutElement.addEventListener("ll-delete-badge", async (ev) => {
      if (!this.lovelace) return;
      performDeleteBadge(this.hass, this.lovelace, ev.detail);
    });
    this._layoutElement.addEventListener("ll-duplicate-card", (ev) => {
      const { cardIndex } = parseLovelaceCardPath(ev.detail.path);
      const viewConfig = this.lovelace!.config.views[this.index];
      if (isStrategyView(viewConfig)) {
        return;
      }
      const cardConfig = viewConfig.cards![cardIndex];
      showEditCardDialog(this, {
        lovelaceConfig: this.lovelace!.config,
        saveCardConfig: async (newCardConfig) => {
          const newConfig = addCard(
            this.lovelace!.config,
            [this.index],
            newCardConfig
          );
          await this.lovelace!.saveConfig(newConfig);
        },
        cardConfig,
        isNew: true,
      });
    });
    this._layoutElement.addEventListener("ll-copy-card", (ev) => {
      if (!this.lovelace) return;
      const { cardIndex } = parseLovelaceCardPath(ev.detail.path);
      const viewConfig = this.lovelace!.config.views[this.index];
      if (isStrategyView(viewConfig)) {
        return;
      }
      const cardConfig = viewConfig.cards![cardIndex];
      this._clipboard = deepClone(cardConfig);
    });
  }

  private _createBadges(config: LovelaceViewConfig): void {
    if (!config || !config.badges || !Array.isArray(config.badges)) {
      this._badges = [];
      return;
    }

    this._badges = config.badges.map((badge) => {
      const badgeConfig = ensureBadgeConfig(badge);
      const element = this.createBadgeElement(badgeConfig);
      return element;
    });
  }

  private _createCards(config: LovelaceViewConfig): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      this._cards = [];
      return;
    }

    this._cards = config.cards.map((cardConfig) => {
      const element = this._createCardElement(cardConfig);
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
