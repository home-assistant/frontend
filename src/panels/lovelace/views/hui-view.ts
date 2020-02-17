import {
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";

import "../../../components/entity/ha-state-label-badge";
// This one is for types
import { classMap } from "lit-html/directives/class-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/entity/ha-state-label-badge";
import {
  LovelaceBadgeConfig,
  LovelaceCardConfig,
  LovelaceViewConfig,
} from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { classMap } from "lit-html/directives/class-map";
import { Lovelace, LovelaceCard, LovelaceBadge } from "../types";
import { createCardElement } from "../create-element/create-card-element";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { HuiErrorCard } from "../cards/hui-error-card";
import { computeCardSize } from "../common/compute-card-size";
import { computeRTL } from "../../../common/util/compute_rtl";
import { debounce } from "../../../common/util/debounce";
import { createBadgeElement } from "../create-element/create-badge-element";
import { processConfigEntities } from "../common/process-config-entities";
import { createBadgeElement } from "../create-element/create-badge-element";
import { createCardElement } from "../create-element/create-card-element";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { Lovelace, LovelaceBadge, LovelaceCard } from "../types";

let murriGrid: any;

let options = {
  dragEnabled: true,
  dragStartPredicate: {
    // Doesn't start drag until these thresholds are met - Up for discussion if needed
    distance: 10,
    delay: 100,
  },
  dragReleaseDuration: 400,
  dragReleaseEasing: "ease",
  dragSortInterval: 0,
  layoutDuration: 400,
  layoutEasing: "ease",
};

let editCodeLoaded = false;

export class HUIView extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public lovelace?: Lovelace;

  @property({ type: Number }) public columns?: number;

  @property({ type: Number }) public index?: number;

  @property() private _cards: Array<LovelaceCard | HuiErrorCard> = [];

  @property() private _badges: LovelaceBadge[] = [];
  private _grids: any[] = [];
  // @ts-ignore
  private _resizeObserver?: ResizeObserver;
  private _debouncedResizeListener = debounce(
    () => {
      if (!this._grids) {
        return;
      }
      this._grids.forEach((grid) => {
        grid.refreshItems().layout();
      });
    },
    100,
    false
  );

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
          color: var(--primary-text-color);
          background: var(
            --lovelace-background,
            var(--primary-background-color)
          );
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
          position: relative;
          overflow-x: hidden;
        }

        .column {
          flex: 1 0 0;
          max-width: 500px;
          min-width: 0;
          /* on iOS devices the column can become wider when toggling a switch */
          overflow: hidden;
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

        .grid {
          position: relative;
          width: 100%;
        }

        .item.edit {
          position: absolute;
          display: block;
          width: 100%;
          z-index: 1;
          box-sizing: border-box;
          padding: 4px;
        }

        .item.muuri-item-dragging {
          z-index: 3;
        }

        .item.muuri-item-releasing {
          z-index: 2;
        }

        .item.muuri-item-hidden {
          z-index: 0;
        }

        .item-content {
          position: relative;
          width: 100%;
          height: 100%;
        }
      </style>
    `;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    const hass = this.hass!;
    const lovelace = this.lovelace!;

    if (lovelace.editMode && !editCodeLoaded) {
      import(
        /* webpackChunkName: "hui-view-editable" */ "./hui-view-editable"
      ).then((editCode) => {
        murriGrid = editCode.Muuri;
        editCodeLoaded = true;
      });
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

    if (editModeChanged && !lovelace!.editMode) {
      this._resizeObserver.disconnect();
      this._grids = [];
    }

    if (
      (configChanged && !lovelace.editMode) ||
      editModeChanged ||
      changedProperties.has("columns") ||
      changedProperties.has("editCodeLoaded")
    ) {
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
    badges.forEach((badge) => {
      const element = createBadgeElement(badge);
      element.hass = this.hass;
      elements.push(element);
      root.appendChild(element);
    });
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
    const columns: HTMLElement[] = [];

    for (let idx = 0; idx < this.columns!; idx++) {
      const columnEl = document.createElement("div");
      columnEl.classList.add("column", "grid");
      root.appendChild(columnEl);
      columns.push(columnEl);
    }

    if (this.lovelace!.editMode) {
      this._attachObserver();

      options = {
        ...options,
        dragContainer: this.shadowRoot!.getElementById("columns")!, // Gives ability to drag outside of one grid
        dragSort: () => {
          // Determines which Grids to drag to
          return this._grids;
        },
      };

      columns.forEach((columnEl) => {
        this._grids.push(
          new murriGrid(columnEl, options) // The events here make sure the card doesnt grow to the size of the window
            .on("dragStart", (item) => {
              item.getElement().style.width = item.getWidth() + "px";
              item.getElement().style.height = item.getHeight() + "px";
            })
            .on("dragReleaseEnd", (item) => {
              item.getElement().style.width = "";
              item.getElement().style.height = "";
              this._storeLayout();
            })
            .on("beforeSend", (data) => {
              data.item.getElement().style.width = data.item.getWidth() + "px";
              data.item.getElement().style.height =
                data.item.getHeight() + "px";
            })
            .on("beforeReceive", (data) => {
              data.item.getElement().style.width = data.item.getWidth() + "px";
              data.item.getElement().style.height =
                data.item.getHeight() + "px";
            })
        );
      });
    }

    config.cards.forEach((cardConfig, cardIndex) => {
      const element = this.createCardElement(cardConfig);
      elements.push(element);

      const item = document.createElement("div");
      item.classList.add("item");

      const itemContent = document.createElement("div");
      itemContent.classList.add("item-content");

      if (!this.lovelace!.editMode) {
        itemContent.appendChild(element);
        item.appendChild(itemContent);
        columns[cardIndex % this.columns!].appendChild(item);
      } else {
        const wrapper = document.createElement("hui-card-options");
        wrapper.hass = this.hass;
        wrapper.lovelace = this.lovelace;
        wrapper.path = [this.index!, cardIndex];
        wrapper.appendChild(element);

        item.classList.add("edit");
        itemContent.appendChild(wrapper);
        item.cardConfig = cardConfig;

        if (this._resizeObserver) {
          this._resizeObserver.observe(item);
        } else {
          item.addEventListener("resize", this._debouncedResizeListener);
        }

        item.appendChild(itemContent);
        this._grids[cardIndex % this.columns!].add(item);
      }
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

  private _storeLayout(): void {
    let maxItems = 0;
    const layout: LovelaceCardConfig[] = [];
    const views: LovelaceViewConfig[] = [];

    // Find max items in a column
    this._grids.forEach((grid) => {
      maxItems =
        grid.getItems().length > maxItems ? grid.getItems().length : maxItems;
    });

    // Go through each column getting the 1st element from each and then the second element from each and so on
    for (let i = 0; i < maxItems; i++) {
      this._grids.forEach((grid) => {
        if (!grid.getItems(i)[0]) {
          return;
        }

        layout.push(grid.getItems(i)[0].getElement().cardConfig);
      });
    }

    // Save Lovelace config - Yes I know - This isnt great
    this.lovelace!.config.views.forEach((viewConf, index) => {
      // Needs improvements to determine the view
      if (index !== 0) {
        views.push(this.lovelace!.config.views[index]);
        return;
      }

      views.push({
        ...viewConf,
        cards: layout,
      });
    });

    this.lovelace!.config = {
      ...this.lovelace!.config,
      views,
    };

    this.lovelace!.saveConfig(this.lovelace!.config);
  }

  private _attachObserver(): void {
    // Observe changes to card size and refreshes grids
    // Uses ResizeObserver in Chrome, otherwise window resize event

    // @ts-ignore
    if (typeof ResizeObserver === "function") {
      // @ts-ignore
      this._resizeObserver = new ResizeObserver(() =>
        this._debouncedResizeListener()
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view": HUIView;
  }
}

customElements.define("hui-view", HUIView);
