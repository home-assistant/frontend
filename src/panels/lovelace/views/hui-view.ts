import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  property,
} from "lit-element";

import "../../../components/entity/ha-state-label-badge";
// This one is for types

import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";

import {
  LovelaceViewConfig,
  LovelaceCardConfig,
  LovelaceBadgeConfig,
} from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { classMap } from "lit-html/directives/class-map";
import { Lovelace, LovelaceCard, LovelaceBadge } from "../types";
import { createCardElement } from "../create-element/create-card-element";
import { computeCardSize } from "../common/compute-card-size";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { HuiErrorCard } from "../cards/hui-error-card";
import { computeRTL } from "../../../common/util/compute_rtl";
import { createBadgeElement } from "../create-element/create-badge-element";
import { processConfigEntities } from "../common/process-config-entities";

let editCodeLoaded = false;

// Find column with < 5 entities, else column with lowest count
const getColumnIndex = (columnEntityCount: number[], size: number) => {
  let minIndex = 0;
  for (let i = 0; i < columnEntityCount.length; i++) {
    if (columnEntityCount[i] < 5) {
      minIndex = i;
      break;
    }
    if (columnEntityCount[i] < columnEntityCount[minIndex]) {
      minIndex = i;
    }
  }

  columnEntityCount[minIndex] += size;

  return minIndex;
};

export class HUIView extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public lovelace?: Lovelace;
  @property({ type: Number }) public columns?: number;
  @property({ type: Number }) public index?: number;
  @property() private _cards: Array<LovelaceCard | HuiErrorCard> = [];
  @property() private _badges: LovelaceBadge[] = [];

  // Public to make demo happy
  public createCardElement(cardConfig: LovelaceCardConfig) {
    const element = createCardElement(cardConfig) as LovelaceCard;
    element.hass = this.hass;
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
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
    return html`
      ${this.renderStyles()}
      <div id="badges"></div>
      <div id="columns"></div>
      ${this.lovelace!.editMode
        ? html`
            <ha-fab
              icon="hass:plus"
              title="${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.add"
              )}"
              @click="${this._addCard}"
              class="${classMap({
                rtl: computeRTL(this.hass!),
              })}"
            ></ha-fab>
          `
        : ""}
    `;
  }

  protected renderStyles(): TemplateResult {
    return html`
      <style>
        :host {
          display: block;
          box-sizing: border-box;
          padding: 4px 4px 0;
          transform: translateZ(0);
          position: relative;
          background: var(--lovelace-background);
        }

        #badges {
          margin: 8px 16px;
          font-size: 85%;
          text-align: center;
        }

        #columns {
          display: flex;
          flex-direction: row;
          justify-content: center;
        }

        .column {
          flex: 1 0 0;
          max-width: 500px;
          min-width: 0;
          /* on iOS devices the column can become wider when toggling a switch */
          overflow-x: hidden;
        }

        .column > * {
          display: block;
          margin: 4px 4px 8px;
        }

        ha-fab {
          position: sticky;
          float: right;
          bottom: 16px;
          right: 16px;
          z-index: 1;
        }

        ha-fab.rtl {
          float: left;
          right: auto;
          left: 16px;
        }

        @media (max-width: 500px) {
          :host {
            padding-left: 0;
            padding-right: 0;
          }

          .column > * {
            margin-left: 0;
            margin-right: 0;
          }
        }

        @media (max-width: 599px) {
          .column {
            max-width: 600px;
          }
        }
      </style>
    `;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    const hass = this.hass!;
    const lovelace = this.lovelace!;

    if (lovelace.editMode && !editCodeLoaded) {
      editCodeLoaded = true;
      import(/* webpackChunkName: "hui-view-editable" */ "./hui-view-editable");
    }

    const hassChanged = changedProperties.has("hass");
    let editModeChanged = false;
    let configChanged = false;

    if (changedProperties.has("index")) {
      configChanged = true;
    } else if (changedProperties.has("lovelace")) {
      const oldLovelace = changedProperties.get("lovelace") as Lovelace;
      editModeChanged =
        !oldLovelace || lovelace.editMode !== oldLovelace.editMode;
      configChanged = !oldLovelace || lovelace.config !== oldLovelace.config;
    }

    if (configChanged) {
      this._createBadges(lovelace.config.views[this.index!]);
    } else if (hassChanged) {
      this._badges.forEach((badge) => {
        badge.hass = hass;
      });
    }

    if (configChanged || editModeChanged || changedProperties.has("columns")) {
      this._createCards(lovelace.config.views[this.index!]);
    } else if (hassChanged) {
      this._cards.forEach((element) => {
        element.hass = this.hass;
      });
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
      console.log(hass.themes, lovelace.config.views[this.index!].theme);
      applyThemesOnElement(
        this,
        hass.themes,
        lovelace.config.views[this.index!].theme
      );
    }
  }

  private _addCard(): void {
    showEditCardDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      saveConfig: this.lovelace!.saveConfig,
      path: [this.index!],
    });
  }

  private _createBadges(config: LovelaceViewConfig): void {
    const root = this.shadowRoot!.getElementById("badges")!;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (!config || !config.badges || !Array.isArray(config.badges)) {
      root.style.display = "none";
      this._badges = [];
      return;
    }

    const elements: HUIView["_badges"] = [];
    const badges = processConfigEntities(config.badges as any);
    for (const badge of badges) {
      const element = createBadgeElement(badge);
      element.hass = this.hass;
      elements.push(element);
      root.appendChild(element);
    }
    this._badges = elements;
    root.style.display = elements.length > 0 ? "block" : "none";
  }

  private _createCards(config: LovelaceViewConfig): void {
    const root = this.shadowRoot!.getElementById("columns")!;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (!config || !config.cards || !Array.isArray(config.cards)) {
      this._cards = [];
      return;
    }

    const elements: LovelaceCard[] = [];
    const elementsToAppend: HTMLElement[] = [];
    config.cards.forEach((cardConfig, cardIndex) => {
      const element = this.createCardElement(cardConfig);
      elements.push(element);

      if (!this.lovelace!.editMode) {
        elementsToAppend.push(element);
        return;
      }

      const wrapper = document.createElement("hui-card-options");
      wrapper.hass = this.hass;
      wrapper.lovelace = this.lovelace;
      wrapper.path = [this.index!, cardIndex];
      wrapper.appendChild(element);
      elementsToAppend.push(wrapper);
    });

    let columns: HTMLElement[][] = [];
    const columnEntityCount: number[] = [];
    for (let i = 0; i < this.columns!; i++) {
      columns.push([]);
      columnEntityCount.push(0);
    }

    elements.forEach((el, index) => {
      const cardSize = computeCardSize(el);
      // Element to append might be the wrapped card when we're editing.
      columns[getColumnIndex(columnEntityCount, cardSize)].push(
        elementsToAppend[index]
      );
    });

    // Remove empty columns
    columns = columns.filter((val) => val.length > 0);

    columns.forEach((column) => {
      const columnEl = document.createElement("div");
      columnEl.classList.add("column");
      column.forEach((el) => columnEl.appendChild(el));
      root.appendChild(columnEl);
    });

    this._cards = elements;
  }

  private _rebuildCard(
    cardElToReplace: LovelaceCard,
    config: LovelaceCardConfig
  ): void {
    const newCardEl = this.createCardElement(config);
    cardElToReplace.parentElement!.replaceChild(newCardEl, cardElToReplace);
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view": HUIView;
  }
}

customElements.define("hui-view", HUIView);
