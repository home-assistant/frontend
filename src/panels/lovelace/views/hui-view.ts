import {
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import type { DataItem, Item } from "muuri";
import type { Options } from "../../../types/Muuri/options";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeRTL } from "../../../common/util/compute_rtl";
import { debounce } from "../../../common/util/debounce";
import "../../../components/entity/ha-state-label-badge";
import {
  LovelaceBadgeConfig,
  LovelaceCardConfig,
  LovelaceViewConfig,
} from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { HuiErrorCard } from "../cards/hui-error-card";
import { processConfigEntities } from "../common/process-config-entities";
import { createBadgeElement } from "../create-element/create-badge-element";
import { createCardElement } from "../create-element/create-card-element";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { Lovelace, LovelaceBadge, LovelaceCard, MuuriItem } from "../types";

let muuri: any;
let installResizeObserver: any;

const gridOptions: Options = {
  dragEnabled: true,
  dragStartPredicate: {
    distance: 10,
    delay: 100,
  },
  dragReleaseDuration: 400,
  dragReleaseEasing: "ease",
  layoutDuration: 400,
  layoutEasing: "ease",
};

export class HUIView extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public lovelace?: Lovelace;

  @property({ type: Number }) public columns?: number;

  @property({ type: Number }) public index?: number;

  @property() private _cards: Array<LovelaceCard | HuiErrorCard> = [];

  @property() private _badges: LovelaceBadge[] = [];

  @property() private _editCodeLoaded = false;

  private _grids: any[] = [];

  private _resizeObserver?: ResizeObserver;

  private _debouncedResizeListener = debounce(
    () => {
      if (!this._grids.length) {
        this._buildMuuriGrids();
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
          padding: 0 4px;
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

    if (lovelace.editMode && !this._editCodeLoaded) {
      import(
        /* webpackChunkName: "hui-view-editable" */ "./hui-view-editable"
      ).then((editCode) => {
        muuri = editCode.Muuri;
        installResizeObserver = editCode.install;
        this._editCodeLoaded = true;
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
      this._grids.forEach((grid) => {
        grid.destroy();
      });
      this._grids = [];

      if (!this._resizeObserver) {
        return;
      }
      this._resizeObserver.disconnect();
    }

    if (this.lovelace!.editMode && this._editCodeLoaded) {
      this._attachObserver();
    }

    if (
      configChanged ||
      editModeChanged ||
      changedProperties.has("columns") ||
      changedProperties.has("_editCodeLoaded")
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

    config.cards.forEach((cardConfig, cardIndex) => {
      const element = this.createCardElement(cardConfig);
      elements.push(element);

      const item = document.createElement("div") as MuuriItem;
      item.classList.add("item");

      const itemContent = document.createElement("div");
      itemContent.classList.add("item-content");

      if (!this.lovelace!.editMode || !this._editCodeLoaded) {
        itemContent.appendChild(element);
      } else {
        const wrapper = document.createElement("hui-card-options");
        wrapper.hass = this.hass;
        wrapper.lovelace = this.lovelace;
        wrapper.path = [this.index!, cardIndex];
        wrapper.appendChild(element);

        item.classList.add("edit");
        itemContent.appendChild(wrapper);
        item.cardConfig = cardConfig;

        this._resizeObserver!.observe(item);
      }

      item.appendChild(itemContent);
      columns[cardIndex % this.columns!].appendChild(item);
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

  private _buildMuuriGrids(): void {
    const options = {
      ...gridOptions,
      dragContainer: this.shadowRoot!.getElementById("columns")!,
      dragSort: () => {
        return this._grids;
      },
    };

    const columns = this.shadowRoot!.querySelectorAll(".column");

    columns.forEach((columnEl) => {
      this._grids.push(
        new muuri(columnEl, options)
          .on("dragStart", (item: Item) => {
            item.getElement().style.width = item.getWidth() + "px";
            item.getElement().style.height = item.getHeight() + "px";
          })
          .on("dragReleaseEnd", (item: Item) => {
            item.getElement().style.width = "";
            item.getElement().style.height = "";
            this._storeLayout();

            this._grids.forEach((grid) => {
              grid.refreshItems().layout();
            });
          })
          .on("beforeSend", (data: DataItem) => {
            data.item.getElement().style.width = data.item.getWidth() + "px";
            data.item.getElement().style.height = data.item.getHeight() + "px";
          })
          .on("beforeReceive", (data: DataItem) => {
            data.item.getElement().style.width = data.item.getWidth() + "px";
            data.item.getElement().style.height = data.item.getHeight() + "px";
          })
      );
    });
  }

  private _storeLayout(): void {
    let maxItems = 0;
    const cards: LovelaceCardConfig[] = [];
    const views: LovelaceViewConfig[] = [];
    const lovelace = this.lovelace!;

    this._grids.forEach((grid) => {
      const itemsCount = grid.getItems().length;
      maxItems = itemsCount > maxItems ? itemsCount : maxItems;
    });

    for (let i = 0; i < maxItems; i++) {
      this._grids.forEach((grid) => {
        if (!grid.getItems(i)[0]) {
          return;
        }

        cards.push(grid.getItems(i)[0].getElement().cardConfig);
      });
    }

    lovelace.config.views.forEach((viewConf, index) => {
      if (index !== this.index) {
        views.push(lovelace.config.views[index]);
        return;
      }

      views.push({
        ...viewConf,
        cards,
      });
    });

    lovelace.config = {
      ...lovelace.config,
      views,
    };

    this.lovelace!.saveConfig(lovelace.config, false);
  }

  private _attachObserver(): void {
    if (typeof ResizeObserver !== "function") {
      installResizeObserver();
    }

    this._resizeObserver = new ResizeObserver(() =>
      this._debouncedResizeListener()
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view": HUIView;
  }
}

customElements.define("hui-view", HUIView);
