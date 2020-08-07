import {
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import "../../../components/entity/ha-state-label-badge";
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
import type { Lovelace, LovelaceBadge, LovelaceCard } from "../types";
import "../../../components/ha-svg-icon";
import { getLovelaceViewElement } from "./get-view";

export class HUIView extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public columns?: number;

  @property({ type: Number }) public index?: number;

  @internalProperty() private _cards: Array<LovelaceCard | HuiErrorCard> = [];

  @internalProperty() private _badges: LovelaceBadge[] = [];

  private _layoutElement?: LovelaceViewElement;

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

  protected render(): TemplateResult {
    if (!this._layoutElement) {
      return html``;
    }

    return html`${this._layoutElement}`;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    const hass = this.hass!;
    const lovelace = this.lovelace!;
    const viewConfig = lovelace.config.views[this.index!];
    const hassChanged = changedProperties.has("hass");

    let editModeChanged = false;
    let configChanged = false;

    if (changedProperties.has("index")) {
      configChanged = true;
    } else if (changedProperties.has("lovelace")) {
      const oldLovelace = changedProperties.get("lovelace") as Lovelace;
      editModeChanged =
        oldLovelace && lovelace.editMode !== oldLovelace.editMode;
      configChanged = !oldLovelace || lovelace.config !== oldLovelace.config;
    }

    if (configChanged && !this._layoutElement) {
      this._layoutElement = getLovelaceViewElement(
        viewConfig.panel ? "panel" : viewConfig.type || "default"
      );
    }

    if (configChanged) {
      this._createBadges(viewConfig);
      this._createCards(viewConfig);

      this._layoutElement!.lovelace = lovelace;
      this._layoutElement!.index = this.index;
    } else if (hassChanged) {
      this._badges.forEach((badge) => {
        badge.hass = hass;
      });

      this._cards.forEach((element) => {
        element.hass = hass;
      });

      this._layoutElement!.hass = this.hass;
    }

    if (editModeChanged) {
      this._layoutElement!.editMode = lovelace.editMode;
    }

    if (configChanged || hassChanged || editModeChanged) {
      this._layoutElement!.cards = this._cards;
      this._layoutElement!.badges = this._badges;
    }

    if (changedProperties.has("columns")) {
      this._layoutElement!.columns = this.columns!;
    }

    const oldHass = changedProperties.get("hass") as this["hass"] | undefined;

    if (
      configChanged ||
      editModeChanged ||
      (hassChanged &&
        oldHass &&
        (hass.themes !== oldHass.themes ||
          hass.selectedTheme !== oldHass.selectedTheme))
    ) {
      applyThemesOnElement(
        this,
        hass.themes,
        lovelace.config.views[this.index!].theme
      );
    }
  }

  private _createBadges(config: LovelaceViewConfig): void {
    if (!config || !config.badges || !Array.isArray(config.badges)) {
      this._badges = [];
      return;
    }

    const elements: HUIView["_badges"] = [];
    const badges = processConfigEntities(config.badges as any);
    badges.forEach((badge) => {
      const element = createBadgeElement(badge);
      element.hass = this.hass;
      elements.push(element);
    });
    this._badges = elements;
  }

  private _createCards(config: LovelaceViewConfig): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      this._cards = [];
      return;
    }

    const elements: LovelaceCard[] = [];
    config.cards.forEach((cardConfig) => {
      const element = this.createCardElement(cardConfig);
      elements.push(element);
    });

    this._cards = elements;
  }

  private _rebuildCard(
    cardElToReplace: LovelaceCard,
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

  private _rebuildBadge(
    badgeElToReplace: LovelaceBadge,
    config: LovelaceBadgeConfig
  ): void {
    const newBadgeEl = this.createBadgeElement(config);
    badgeElToReplace.parentElement!.replaceChild(newBadgeEl, badgeElToReplace);
    this._badges = this._cards!.map((curBadgeEl) =>
      curBadgeEl === badgeElToReplace ? newBadgeEl : curBadgeEl
    );
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        box-sizing: border-box;
        padding: 4px 4px env(safe-area-inset-bottom);
        transform: translateZ(0);
        position: relative;
        color: var(--primary-text-color);
        background: var(--lovelace-background, var(--primary-background-color));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view": HUIView;
  }
}

customElements.define("hui-view", HUIView);
