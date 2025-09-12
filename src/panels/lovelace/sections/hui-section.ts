import deepClone from "deep-clone-simple";
import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { storage } from "../../../common/decorators/storage";
import { fireEvent } from "../../../common/dom/fire_event";
import type { MediaQueriesListener } from "../../../common/dom/media_query";
import "../../../components/ha-svg-icon";
import type { LovelaceSectionElement } from "../../../data/lovelace";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type {
  LovelaceSectionConfig,
  LovelaceSectionRawConfig,
} from "../../../data/lovelace/config/section";
import { isStrategySection } from "../../../data/lovelace/config/section";
import type { HomeAssistant } from "../../../types";
import "../cards/hui-card";
import type { HuiCard } from "../cards/hui-card";
import {
  attachConditionMediaQueriesListeners,
  checkConditionsMet,
} from "../common/validate-condition";
import { createSectionElement } from "../create-element/create-section-element";
import { showCreateCardDialog } from "../editor/card-editor/show-create-card-dialog";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { addCard, replaceCard } from "../editor/config-util";
import { performDeleteCard } from "../editor/delete-card";
import { parseLovelaceCardPath } from "../editor/lovelace-path";
import { generateLovelaceSectionStrategy } from "../strategies/get-strategy";
import type { Lovelace } from "../types";
import { DEFAULT_SECTION_LAYOUT } from "./const";

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

  @property({ type: Boolean, reflect: true }) public preview = false;

  @property({ type: Boolean, attribute: "import-only" })
  public importOnly = false;

  @property({ type: Number }) public index!: number;

  @property({ attribute: false, type: Number }) public viewIndex!: number;

  @state() private _cards: HuiCard[] = [];

  private _layoutElementType?: string;

  private _layoutElement?: LovelaceSectionElement;

  private _listeners: MediaQueriesListener[] = [];

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
    element.preview = this.preview;
    element.config = cardConfig;
    element.addEventListener("card-updated", (ev: Event) => {
      ev.stopPropagation();
      this._cards = [...this._cards];
    });
    element.load();
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
          element.hass = this.hass;
        });
        this._layoutElement.hass = this.hass;
      }
      if (changedProperties.has("lovelace")) {
        this._layoutElement.lovelace = this.lovelace;
      }
      if (changedProperties.has("preview")) {
        this._layoutElement.preview = this.preview;
        this._cards.forEach((element) => {
          element.preview = this.preview;
        });
      }
      if (changedProperties.has("importOnly")) {
        this._layoutElement.importOnly = this.importOnly;
      }
      if (changedProperties.has("_cards")) {
        this._layoutElement.cards = this._cards;
      }
      if (changedProperties.has("hass") || changedProperties.has("preview")) {
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
        sectionConfig,
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

  private _updateElement(ignoreConditions?: boolean) {
    if (!this._layoutElement) {
      return;
    }

    if (this.preview) {
      this._setElementVisibility(true);
      return;
    }

    if (this.config.hidden) {
      this._setElementVisibility(false);
      return;
    }

    const visible =
      ignoreConditions ||
      !this.config.visibility ||
      checkConditionsMet(this.config.visibility, this.hass);

    this._setElementVisibility(visible);
  }

  private _setElementVisibility(visible: boolean) {
    if (!this._layoutElement) return;

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
      const sectionConfig = this.config;
      if (isStrategySection(sectionConfig)) {
        return;
      }
      const cardConfig = sectionConfig.cards![cardIndex];
      showEditCardDialog(this, {
        lovelaceConfig: this.lovelace.config,
        saveCardConfig: async (newCardConfig) => {
          const newConfig = replaceCard(
            this.lovelace!.config,
            [this.viewIndex, this.index, cardIndex],
            newCardConfig
          );
          await this.lovelace!.saveConfig(newConfig);
        },
        sectionConfig,
        cardConfig,
      });
    });
    this._layoutElement.addEventListener("ll-delete-card", (ev) => {
      ev.stopPropagation();
      if (!this.lovelace) return;
      performDeleteCard(this.hass, this.lovelace, ev.detail);
    });
    this._layoutElement.addEventListener("ll-duplicate-card", (ev) => {
      ev.stopPropagation();
      if (!this.lovelace) return;
      const { cardIndex } = parseLovelaceCardPath(ev.detail.path);
      const sectionConfig = this.config;
      if (isStrategySection(sectionConfig)) {
        return;
      }
      const cardConfig = sectionConfig.cards![cardIndex];

      showEditCardDialog(this, {
        lovelaceConfig: this.lovelace!.config,
        saveCardConfig: async (newCardConfig) => {
          const newConfig = addCard(
            this.lovelace!.config,
            [this.viewIndex, this.index],
            newCardConfig
          );
          await this.lovelace!.saveConfig(newConfig);
        },
        cardConfig,
        sectionConfig,
        isNew: true,
      });
    });
    this._layoutElement.addEventListener("ll-copy-card", (ev) => {
      ev.stopPropagation();
      if (!this.lovelace) return;
      const { cardIndex } = parseLovelaceCardPath(ev.detail.path);
      const sectionConfig = this.config;

      if (isStrategySection(sectionConfig)) {
        return;
      }
      const cardConfig = sectionConfig.cards![cardIndex];
      this._clipboard = deepClone(cardConfig);
    });
  }

  private _createCards(config: LovelaceSectionConfig): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      this._cards = [];
      return;
    }

    this._cards = config.cards.map((cardConfig) =>
      this._createCardElement(cardConfig)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section": HuiSection;
  }
}
