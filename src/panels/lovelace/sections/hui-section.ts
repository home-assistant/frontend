import deepClone from "deep-clone-simple";
import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { storage } from "../../../common/decorators/storage";
import { deepEqual } from "../../../common/util/deep-equal";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-svg-icon";
import type { LovelaceSectionElement } from "../../../data/lovelace";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type {
  LovelaceSectionConfig,
  LovelaceSectionRawConfig,
  LovelaceSectionRefConfig,
} from "../../../data/lovelace/config/section";
import {
  isSectionRef,
  isStrategySection,
} from "../../../data/lovelace/config/section";
import type { LovelaceConfig } from "../../../data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import { isStrategyView } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import { ConditionalListenerMixin } from "../../../mixins/conditional-listener-mixin";
import "../cards/hui-card";
import type { HuiCard } from "../cards/hui-card";
import { checkConditionsMet } from "../common/validate-condition";
import { createSectionElement } from "../create-element/create-section-element";
import { showCreateCardDialog } from "../editor/card-editor/show-create-card-dialog";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import {
  addCard,
  getSharedSection,
  replaceCard,
  updateSharedSection,
} from "../editor/config-util";
import { performDeleteCard } from "../editor/delete-card";
import { parseLovelaceCardPath } from "../editor/lovelace-path";
import {
  checkStrategyShouldRegenerate,
  generateLovelaceSectionStrategy,
} from "../strategies/get-strategy";
import type { Lovelace } from "../types";
import { DEFAULT_SECTION_LAYOUT } from "./const";

declare global {
  interface HASSDomEvents {
    "section-visibility-changed": { value: boolean };
  }
}

@customElement("hui-section")
export class HuiSection extends ConditionalListenerMixin<LovelaceSectionConfig>(
  ReactiveElement
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceSectionRawConfig;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Boolean, reflect: true }) public preview = false;

  @property({ type: Boolean, attribute: "import-only" })
  public importOnly = false;

  @property({ type: Number }) public index!: number;

  @property({ attribute: false }) public viewIndex!: number;

  @state() private _cards: HuiCard[] = [];

  private _layoutElementType?: string;

  private _layoutElement?: LovelaceSectionElement;

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

  public willUpdate(changedProperties: PropertyValues<this>): void {
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

    // Re-initialize when config changes, or when the lovelace context changes
    // for a ref section (shared_sections update won't change this.config itself).
    if (
      (changedProperties.has("config") &&
        (!oldConfig || this.config !== oldConfig)) ||
      (changedProperties.has("lovelace") && isSectionRef(this.config))
    ) {
      this._initializeConfig();
      return;
    }

    if (!changedProperties.has("hass")) {
      return;
    }

    const oldHass = changedProperties.get("hass") as HomeAssistant | undefined;
    if (
      oldHass &&
      this.hass &&
      isStrategySection(this.config) &&
      this.hass.config.state === "RUNNING" &&
      (oldHass.config.state !== "RUNNING" ||
        checkStrategyShouldRegenerate(
          "section",
          this.config.strategy,
          oldHass,
          this.hass
        ))
    ) {
      this._debounceRefreshConfig();
    }
  }

  private _debounceRefreshConfig = debounce(
    () => this._initializeConfig(),
    200
  );

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      "card-visibility-changed",
      this._cardVisibilityChanged
    );
  }

  public connectedCallback() {
    super.connectedCallback();
    this._updateVisibility();
    this.addEventListener(
      "card-visibility-changed",
      this._cardVisibilityChanged
    );
    // Reapply theme on reconnect (e.g., after navigating away and back)
    if (this.hass && this._config?.theme) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  protected update(changedProperties: PropertyValues) {
    super.update(changedProperties);

    // If no layout element, we're still creating one
    if (this._layoutElement) {
      // Config has not changed. Just props
      if (changedProperties.has("hass")) {
        this._cards.forEach((element) => {
          element.hass = this.hass;
        });
        this._layoutElement.hass = this.hass;
        // React to theme or dark mode changes
        const oldHass = changedProperties.get("hass");
        if (
          !oldHass ||
          this.hass.themes !== oldHass.themes ||
          this.hass.selectedTheme !== oldHass.selectedTheme
        ) {
          applyThemesOnElement(this, this.hass.themes, this._config?.theme);
        }
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
      if (
        changedProperties.has("hass") ||
        changedProperties.has("preview") ||
        changedProperties.has("_cards")
      ) {
        this._updateVisibility();
      }
    }
  }

  private async _initializeConfig() {
    let sectionConfig = { ...this.config };
    let isStrategy = false;

    if (isSectionRef(sectionConfig)) {
      // Resolve the ref to its shared definition from the dashboard config
      const sharedDef = getSharedSection(
        this.lovelace!.config,
        sectionConfig.section_ref
      );
      if (sharedDef) {
        sectionConfig = {
          ...sharedDef,
          // Layout overrides on the ref take precedence over the shared definition
          ...(sectionConfig.column_span !== undefined && {
            column_span: sectionConfig.column_span,
          }),
          ...(sectionConfig.row_span !== undefined && {
            row_span: sectionConfig.row_span,
          }),
        } as LovelaceSectionConfig;
      } else {
        // Broken ref — render an empty grid section so the view doesn't crash
        sectionConfig = { type: "grid", cards: [] } as LovelaceSectionConfig;
      }
    } else if (isStrategySection(sectionConfig)) {
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

    if (isStrategy && deepEqual(sectionConfig, this._config)) {
      return;
    }

    this._config = sectionConfig;
    // Apply theme now that config is set (after potential strategy await)
    applyThemesOnElement(this, this.hass!.themes, this._config.theme);

    // Create a new layout element if necessary.
    let addLayoutElement = false;

    if (
      !this._layoutElement ||
      this._layoutElementType !== sectionConfig.type
    ) {
      addLayoutElement = true;
      this._createLayoutElement(this._config);
    } else {
      this._layoutElement.setConfig(sectionConfig);
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
      this._updateVisibility();
    }
  }

  private _cardVisibilityChanged = () => {
    this._updateVisibility();
  };

  protected _updateVisibility(conditionsMet?: boolean) {
    if (!this._layoutElement || !this._config) {
      return;
    }

    if (this.preview) {
      this._setElementVisibility(true);
      return;
    }

    if (this._config.disabled) {
      this._setElementVisibility(false);
      return;
    }

    const visible =
      conditionsMet ??
      (!this._config.visibility ||
        checkConditionsMet(
          this._config.visibility,
          this.hass,
          this._conditionContext
        ));

    if (!visible) {
      this._setElementVisibility(false);
      return;
    }

    // Hide section when all cards are conditionally hidden
    const allCardsHidden =
      this._cards.length > 0 && this._cards.every((card) => card.hidden);

    this._setElementVisibility(!allCardsHidden);
  }

  private _setElementVisibility(visible: boolean) {
    if (!this._layoutElement) return;

    if (this.hidden !== !visible) {
      this.style.setProperty("display", visible ? "" : "none");
      this.toggleAttribute("hidden", !visible);
      fireEvent(this, "section-visibility-changed", { value: visible });
    }

    // Always keep layout element connected so cards can still update
    // their visibility and bubble events back to the section.
    if (!this._layoutElement.parentElement) {
      this.appendChild(this._layoutElement);
    }
  }

  /**
   * For a ref section, return a "virtual" lovelace config where the ref at
   * [viewIndex, sectionIndex] is temporarily replaced by the resolved concrete
   * section. Card dialogs can operate on the virtual config, then we extract
   * the modified cards array and persist via updateSharedSection.
   */
  private _virtualConfigForRef(): LovelaceConfig | null {
    if (!isSectionRef(this.config) || !this._config || !this.lovelace) {
      return null;
    }
    const views = this.lovelace.config.views.map((v, vi) => {
      if (vi !== this.viewIndex || isStrategyView(v)) return v;
      const view = v as LovelaceViewConfig;
      return {
        ...view,
        sections: view.sections!.map((s, si) =>
          si === this.index ? this._config! : s
        ),
      };
    });
    return { ...this.lovelace.config, views };
  }

  /**
   * Save a virtual config (produced by _virtualConfigForRef) by extracting
   * the modified section cards and persisting them in shared_sections.
   */
  private _saveVirtualRefConfig = async (
    virtualConfig: LovelaceConfig
  ): Promise<void> => {
    if (!isSectionRef(this.config) || !this.lovelace) return;
    const refId = (this.config as LovelaceSectionRefConfig).section_ref;
    const virtualView = virtualConfig.views[
      this.viewIndex
    ] as LovelaceViewConfig;
    const updatedSection = virtualView.sections?.[
      this.index
    ] as LovelaceSectionConfig;
    const newRealConfig = updateSharedSection(this.lovelace.config, refId, {
      cards: updatedSection?.cards ?? [],
    });
    await this.lovelace.saveConfig(newRealConfig);
  };

  private _createLayoutElement(config: LovelaceSectionConfig): void {
    this._layoutElement = createSectionElement(
      config
    ) as LovelaceSectionElement;
    this._layoutElementType = config.type;
    this._layoutElement.addEventListener("ll-create-card", (ev) => {
      ev.stopPropagation();
      if (!this.lovelace) return;
      const isRef = isSectionRef(this.config);
      const lovelaceConfig = isRef
        ? (this._virtualConfigForRef() ?? this.lovelace.config)
        : this.lovelace.config;
      showCreateCardDialog(this, {
        lovelaceConfig,
        saveConfig: isRef
          ? this._saveVirtualRefConfig
          : this.lovelace.saveConfig,
        path: [this.viewIndex, this.index],
        suggestedCards: ev.detail?.suggested,
      });
    });
    this._layoutElement.addEventListener("ll-edit-card", (ev) => {
      ev.stopPropagation();
      if (!this.lovelace) return;
      const { cardIndex } = parseLovelaceCardPath(ev.detail.path);
      const sectionConfig = this.config;
      if (isStrategySection(sectionConfig)) return;

      // For ref sections use the resolved _config for card data
      const resolvedConfig = isSectionRef(sectionConfig)
        ? this._config
        : sectionConfig;
      if (!resolvedConfig) return;
      const cardConfig = resolvedConfig.cards?.[cardIndex];
      if (!cardConfig) return;

      if (isSectionRef(sectionConfig)) {
        showEditCardDialog(this, {
          lovelaceConfig: this._virtualConfigForRef() ?? this.lovelace.config,
          saveCardConfig: async (newCardConfig) => {
            const refId = (sectionConfig as LovelaceSectionRefConfig)
              .section_ref;
            const currentCards = [...(this._config?.cards ?? [])];
            currentCards[cardIndex] = newCardConfig;
            const newRealConfig = updateSharedSection(
              this.lovelace!.config,
              refId,
              { cards: currentCards }
            );
            await this.lovelace!.saveConfig(newRealConfig);
          },
          sectionConfig: resolvedConfig,
          cardConfig,
        });
      } else {
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
      }
    });
    this._layoutElement.addEventListener("ll-delete-card", (ev) => {
      ev.stopPropagation();
      if (!this.lovelace) return;
      if (isSectionRef(this.config)) {
        // For ref sections, delete from the shared definition cards array
        const { cardIndex } = parseLovelaceCardPath(ev.detail.path);
        const refId = (this.config as LovelaceSectionRefConfig).section_ref;
        const newCards = (this._config?.cards ?? []).filter(
          (_, i) => i !== cardIndex
        );
        const newConfig = updateSharedSection(this.lovelace.config, refId, {
          cards: newCards,
        });
        this.lovelace.saveConfig(newConfig);
        return;
      }
      performDeleteCard(this.hass, this.lovelace, ev.detail);
    });
    this._layoutElement.addEventListener("ll-duplicate-card", (ev) => {
      ev.stopPropagation();
      if (!this.lovelace) return;
      const { cardIndex } = parseLovelaceCardPath(ev.detail.path);
      const sectionConfig = this.config;
      if (isStrategySection(sectionConfig)) return;

      const resolvedConfig = isSectionRef(sectionConfig)
        ? this._config
        : sectionConfig;
      if (!resolvedConfig) return;
      const cardConfig = resolvedConfig.cards?.[cardIndex];
      if (!cardConfig) return;

      if (isSectionRef(sectionConfig)) {
        showEditCardDialog(this, {
          lovelaceConfig: this._virtualConfigForRef() ?? this.lovelace.config,
          saveCardConfig: async (newCardConfig) => {
            const refId = (sectionConfig as LovelaceSectionRefConfig)
              .section_ref;
            const newCards = [...(this._config?.cards ?? []), newCardConfig];
            const newRealConfig = updateSharedSection(
              this.lovelace!.config,
              refId,
              { cards: newCards }
            );
            await this.lovelace!.saveConfig(newRealConfig);
          },
          cardConfig,
          sectionConfig: resolvedConfig,
          isNew: true,
        });
      } else {
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
      }
    });
    this._layoutElement.addEventListener("ll-copy-card", (ev) => {
      ev.stopPropagation();
      if (!this.lovelace) return;
      const { cardIndex } = parseLovelaceCardPath(ev.detail.path);
      const sectionConfig = this.config;

      if (isStrategySection(sectionConfig)) return;

      // For ref sections use the resolved _config for card data
      const resolvedConfig = isSectionRef(sectionConfig)
        ? this._config
        : sectionConfig;
      if (!resolvedConfig) return;
      const cardConfig = resolvedConfig.cards?.[cardIndex];
      if (!cardConfig) return;
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
