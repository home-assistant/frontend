import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { deepEqual } from "../../../common/util/deep-equal";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-svg-icon";
import type { LovelaceSectionElement } from "../../../data/lovelace";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type {
  LovelaceSectionConfig,
  LovelaceSectionRawConfig,
} from "../../../data/lovelace/config/section";
import { isStrategySection } from "../../../data/lovelace/config/section";
import type { HomeAssistant } from "../../../types";
import { ConditionalListenerMixin } from "../../../mixins/conditional-listener-mixin";
import "../badges/hui-badge";
import type { HuiBadge } from "../badges/hui-badge";
import "../cards/hui-card";
import type { HuiCard } from "../cards/hui-card";
import { createSectionElement } from "../create-element/create-section-element";
import type { LovelacePath } from "../editor/lovelace-path";
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

  @property({ attribute: false }) public insideStrategy = false;

  @property({ attribute: false }) public path!: LovelacePath;

  @state() private _cards: HuiCard[] = [];

  @state() private _badges: HuiBadge[] = [];

  @state() private _sections: HuiSection[] = [];

  private _layoutElementType?: string;

  private _layoutElement?: LovelaceSectionElement;

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

  private _createBadgeElement(badgeConfig: LovelaceBadgeConfig) {
    const element = document.createElement("hui-badge");
    element.hass = this.hass;
    element.preview = this.preview;
    element.config = badgeConfig;
    element.addEventListener("badge-updated", (ev: Event) => {
      ev.stopPropagation();
      this._badges = [...this._badges];
    });
    element.load();
    return element;
  }

  private _createSectionElement(
    sectionConfig: LovelaceSectionRawConfig,
    index: number,
    insideStrategy: boolean
  ) {
    const element = document.createElement("hui-section");
    element.hass = this.hass;
    element.lovelace = this.lovelace;
    element.preview = this.preview;
    element.importOnly = this.importOnly;
    element.insideStrategy = insideStrategy;
    element.config = sectionConfig;
    if (this.path) {
      element.path = [...this.path, "sections", index];
    }
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

    // If config has changed, create element if necessary and set all values.
    if (
      changedProperties.has("config") &&
      (!oldConfig || this.config !== oldConfig)
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
      this._contentVisibilityChanged
    );
    this.removeEventListener(
      "badge-visibility-changed",
      this._contentVisibilityChanged
    );
    this.removeEventListener(
      "section-visibility-changed",
      this._sectionVisibilityChanged
    );
  }

  public connectedCallback() {
    super.connectedCallback();
    this._updateVisibility();
    this.addEventListener(
      "card-visibility-changed",
      this._contentVisibilityChanged
    );
    this.addEventListener(
      "badge-visibility-changed",
      this._contentVisibilityChanged
    );
    this.addEventListener(
      "section-visibility-changed",
      this._sectionVisibilityChanged
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
        this._badges.forEach((element) => {
          element.hass = this.hass;
        });
        this._sections.forEach((element) => {
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
        this._sections.forEach((element) => {
          element.lovelace = this.lovelace;
        });
      }
      if (changedProperties.has("preview")) {
        this._layoutElement.preview = this.preview;
        this._cards.forEach((element) => {
          element.preview = this.preview;
        });
        this._badges.forEach((element) => {
          element.preview = this.preview;
        });
        this._sections.forEach((element) => {
          element.preview = this.preview;
        });
      }
      if (changedProperties.has("importOnly")) {
        this._layoutElement.importOnly = this.importOnly;
        this._sections.forEach((element) => {
          element.importOnly = this.importOnly;
        });
      }
      if (changedProperties.has("path")) {
        this._layoutElement.path = this.path;
        this._sections.forEach((element, index) => {
          element.path = [...this.path, "sections", index];
        });
      }
      if (changedProperties.has("_cards")) {
        this._layoutElement.cards = this._cards;
      }
      if (changedProperties.has("_badges")) {
        this._layoutElement.badges = this._badges;
      }
      if (changedProperties.has("_sections")) {
        this._layoutElement.sections = this._sections;
      }
      if (
        changedProperties.has("hass") ||
        changedProperties.has("preview") ||
        changedProperties.has("_cards") ||
        changedProperties.has("_badges") ||
        changedProperties.has("_sections")
      ) {
        this._updateVisibility();
      }
    }
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

    if (isStrategy && deepEqual(sectionConfig, this._config)) {
      return;
    }

    this._config = sectionConfig;
    // `_config` isn't reactive; strategy sections assign it after the last
    // update, so re-feed visibility now.
    this.setupConditionalListeners();
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

    const fromStrategy = isStrategy || this.insideStrategy;

    this._createCards(sectionConfig);
    this._createBadges(sectionConfig);
    this._createSections(sectionConfig, fromStrategy);
    this._layoutElement!.isStrategy = fromStrategy;
    this._layoutElement!.hass = this.hass;
    this._layoutElement!.lovelace = this.lovelace;
    this._layoutElement!.path = this.path;
    this._layoutElement!.cards = this._cards;
    this._layoutElement!.badges = this._badges;
    this._layoutElement!.sections = this._sections;

    if (addLayoutElement) {
      while (this.lastChild) {
        this.removeChild(this.lastChild);
      }
      this._updateVisibility();
    }
  }

  private _contentVisibilityChanged = () => {
    this._updateVisibility();
  };

  private _sectionVisibilityChanged = (ev: Event) => {
    if (ev.target !== this) {
      this._updateVisibility();
    }
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

    const visible = conditionsMet ?? this._conditionsVisible();

    if (!visible) {
      this._setElementVisibility(false);
      return;
    }

    // Hide section when all its content is conditionally hidden
    const content = [...this._cards, ...this._badges, ...this._sections];
    const allContentHidden =
      content.length > 0 && content.every((element) => element.hidden);

    this._setElementVisibility(!allContentHidden);
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

  private _createLayoutElement(config: LovelaceSectionConfig): void {
    this._layoutElement = createSectionElement(
      config
    ) as LovelaceSectionElement;
    this._layoutElementType = config.type;
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

  private _createBadges(config: LovelaceSectionConfig): void {
    if (!config || !config.badges || !Array.isArray(config.badges)) {
      this._badges = [];
      return;
    }

    this._badges = config.badges.map((badgeConfig) =>
      this._createBadgeElement(badgeConfig)
    );
  }

  private _createSections(
    config: LovelaceSectionConfig,
    insideStrategy: boolean
  ): void {
    if (!config || !config.sections || !Array.isArray(config.sections)) {
      this._sections = [];
      return;
    }

    this._sections = config.sections.map((sectionConfig, index) =>
      this._createSectionElement(sectionConfig, index, insideStrategy)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section": HuiSection;
  }
}
