import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { MediaQueriesListener } from "../../../common/dom/media_query";
import "../../../components/ha-svg-icon";
import type { LovelaceSectionElement } from "../../../data/lovelace";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import {
  LovelaceSectionConfig,
  LovelaceSectionRawConfig,
  isStrategySection,
} from "../../../data/lovelace/config/section";
import type { HomeAssistant } from "../../../types";
import "../cards/hui-card";
import type { HuiCard } from "../cards/hui-card";
import {
  attachConditionMediaQueriesListeners,
  checkConditionsMet,
} from "../common/validate-condition";
import { createErrorCardConfig } from "../create-element/create-element-base";
import { createSectionElement } from "../create-element/create-section-element";
import { showCreateCardDialog } from "../editor/card-editor/show-create-card-dialog";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { deleteCard } from "../editor/config-util";
import { confDeleteCard } from "../editor/delete-card";
import { parseLovelaceCardPath } from "../editor/lovelace-path";
import { generateLovelaceSectionStrategy } from "../strategies/get-strategy";
import type { Lovelace } from "../types";
import { DEFAULT_SECTION_LAYOUT } from "./const";
import { fireEvent } from "../../../common/dom/fire_event";

declare global {
  interface HASSDomEvents {
    "section-visibility-changed": { value: boolean };
  }
}

@customElement("hui-section")
export class HuiSection extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceSectionRawConfig;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index!: number;

  @property({ type: Number }) public viewIndex!: number;

  @state() private _cards: HuiCard[] = [];

  private _layoutElementType?: string;

  private _layoutElement?: LovelaceSectionElement;

  private _listeners: MediaQueriesListener[] = [];

  // Public to make demo happy
  public createCardElement(cardConfig: LovelaceCardConfig) {
    const element = document.createElement("hui-card");
    element.hass = this.hass;
    element.lovelace = this.lovelace;
    element.setConfig(cardConfig);
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
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._clearMediaQueries();
  }

  public connectedCallback() {
    super.connectedCallback();
    this._listenMediaQueries();
    this._updateElement();
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
        this._cards.forEach((element) => {
          try {
            element.lovelace = this.lovelace;
          } catch (e: any) {
            this._rebuildCard(element, createErrorCardConfig(e.message, null));
          }
        });
      }
      if (changedProperties.has("_cards")) {
        this._layoutElement.cards = this._cards;
      }
      if (changedProperties.has("hass") || changedProperties.has("lovelace")) {
        this._updateElement();
      }
    }
  }

  private _clearMediaQueries() {
    this._listeners.forEach((unsub) => unsub());
    this._listeners = [];
  }

  private _listenMediaQueries() {
    this._clearMediaQueries();
    if (!this.config?.visibility) {
      return;
    }
    const conditions = this.config.visibility;
    const hasOnlyMediaQuery =
      conditions.length === 1 &&
      conditions[0].condition === "screen" &&
      conditions[0].media_query != null;

    this._listeners = attachConditionMediaQueriesListeners(
      this.config.visibility,
      (matches) => {
        this._updateElement(hasOnlyMediaQuery && matches);
      }
    );
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
      this._updateElement();
    }
  }

  private _updateElement(forceVisible?: boolean) {
    if (!this._layoutElement) {
      return;
    }
    const visible =
      forceVisible ||
      this.lovelace?.editMode ||
      !this.config.visibility ||
      checkConditionsMet(this.config.visibility, this.hass);

    if (this.hidden !== !visible) {
      this.style.setProperty("display", visible ? "" : "none");
      this.toggleAttribute("hidden", !visible);
      fireEvent(this, "section-visibility-changed", { value: visible });
    }

    if (!visible && this._layoutElement.parentElement) {
      this.removeChild(this._layoutElement);
    } else if (visible && !this._layoutElement.parentElement) {
      this.appendChild(this._layoutElement);
    }
  }

  private _createLayoutElement(config: LovelaceSectionConfig): void {
    this._layoutElement = createSectionElement(
      config
    ) as LovelaceSectionElement;
    this._layoutElementType = config.type;
    this._layoutElement.addEventListener("ll-create-card", (ev) => {
      ev.stopPropagation();
      if (!this.lovelace) return;
      showCreateCardDialog(this, {
        lovelaceConfig: this.lovelace.config,
        saveConfig: this.lovelace.saveConfig,
        path: [this.viewIndex, this.index],
        suggestedCards: ev.detail?.suggested,
      });
    });
    this._layoutElement.addEventListener("ll-edit-card", (ev) => {
      ev.stopPropagation();
      if (!this.lovelace) return;
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
      if (!this.lovelace) return;
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
      return element;
    });
  }

  private _rebuildCard(
    cardElToReplace: HuiCard,
    config: LovelaceCardConfig
  ): void {
    const newCardEl = this.createCardElement(config);
    if (cardElToReplace.parentElement) {
      cardElToReplace.parentElement!.replaceChild(newCardEl, cardElToReplace);
    }
    this._cards = this._cards!.map((curCardEl) =>
      curCardEl === cardElToReplace ? newCardEl : curCardEl
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section": HuiSection;
  }
}
