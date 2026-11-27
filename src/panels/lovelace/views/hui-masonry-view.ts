import { mdiPlus } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { ConfigPath } from "../../../common/util/config-path";
import { fireEvent } from "../../../common/dom/fire_event";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-button";
import "../../../components/ha-svg-icon";
import type { LovelaceViewElement } from "../../../data/lovelace";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { HuiBadge } from "../badges/hui-badge";
import "../badges/hui-view-badges";
import type { HuiCard } from "../cards/hui-card";
import type { Lovelace } from "../types";
import type { ColumnsDecision } from "./masonry-columns";
import { assignColumns, decideColumns } from "./masonry-columns";

@customElement("hui-masonry-view")
export class MasonryView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public path?: ConfigPath;

  @property({ attribute: false }) public isStrategy = false;

  @property({ attribute: false }) public cards: HuiCard[] = [];

  @property({ attribute: false }) public badges: HuiBadge[] = [];

  @state() private _columns?: number;

  private _createColumnsIteration = 0;

  private _renderedColumns?: number;

  private _mqls?: MediaQueryList[];

  private _mqlListenerRef?: () => void;

  private _resolveInitialRender?: () => void;

  public initialRenderComplete = new Promise<void>((resolve) => {
    this._resolveInitialRender = resolve;
  });

  public connectedCallback() {
    super.connectedCallback();
    this._initMqls();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._mqls?.forEach((mql) => {
      mql.removeEventListener("change", this._mqlListenerRef!);
    });
    this._mqlListenerRef = undefined;
    this._mqls = undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public setConfig(_config: LovelaceViewConfig): void {}

  protected render(): TemplateResult {
    return html`
      <hui-view-badges
        .badges=${this.badges}
        .lovelace=${this.lovelace}
        .path=${[...this.path!, "badges"]}
        show-add-label
      ></hui-view-badges>
      <div
        id="columns"
        class=${this.lovelace?.editMode ? "edit-mode" : ""}
      ></div>
      ${
        this.lovelace?.editMode
          ? html`
              <ha-button size="l" @click=${this._addCard}>
                <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                ${this.hass!.localize("ui.panel.lovelace.editor.edit_card.add")}
              </ha-button>
            `
          : ""
      }
    `;
  }

  private _initMqls() {
    this._mqls = [300, 600, 900, 1200].map((width) => {
      const mql = window.matchMedia(`(min-width: ${width}px)`);
      if (!this._mqlListenerRef) {
        this._mqlListenerRef = this._updateColumns.bind(this);
      }
      mql.addEventListener("change", this._mqlListenerRef);
      return mql;
    });
  }

  private get mqls(): MediaQueryList[] {
    if (!this._mqls) {
      this._initMqls();
    }
    return this._mqls!;
  }

  public willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);

    if (this.lovelace?.editMode) {
      import("./default-view-editable");
    }

    if (changedProperties.has("hass")) {
      const oldHass = changedProperties.get("hass") as
        HomeAssistant | undefined;

      if (this.hass!.dockedSidebar !== oldHass?.dockedSidebar) {
        this._updateColumns();
        return;
      }
    }

    if (changedProperties.has("narrow")) {
      this._updateColumns();
      return;
    }

    const oldLovelace = changedProperties.get("lovelace") as
      Lovelace | undefined;

    if (
      changedProperties.has("cards") ||
      (changedProperties.has("lovelace") &&
        oldLovelace &&
        (oldLovelace.config !== this.lovelace!.config ||
          oldLovelace.editMode !== this.lovelace!.editMode))
    ) {
      this._createColumns();
    }
  }

  private _addCard(): void {
    fireEvent(this, "ll-create-card", { path: [...this.path!, "cards"] });
  }

  private async _createColumns() {
    if (!this._columns) {
      return;
    }

    this._createColumnsIteration++;
    const iteration = this._createColumnsIteration;

    await this.updateComplete;
    if (iteration !== this._createColumnsIteration) {
      return;
    }

    const root = this.shadowRoot!.getElementById("columns") as HTMLDivElement;
    const cards = this.cards;
    const editMode = this.lovelace!.editMode;

    // Remove old columns, unless only card sizes changed. Then the columns are
    // reused, so cards that keep their place are not removed from the DOM.
    if (editMode || this._columns !== this._renderedColumns) {
      while (root.lastChild) {
        root.removeChild(root.lastChild);
      }
    }
    this._renderedColumns = this._columns;

    // Remove cards that are no longer in the view and edit mode wrappers
    const cardSet = new Set<Element>(cards);
    for (const column of root.children) {
      for (const child of Array.from(column.children)) {
        if (!cardSet.has(child)) {
          child.remove();
        }
      }
    }

    if (
      cards.length === 0 ||
      Array.from(root.children).some((column) => column.lastChild)
    ) {
      this._resolveInitialRender?.();
      this._resolveInitialRender = undefined;
    }

    // Limit the number of columns to the number of cards
    const maxColumns = Math.min(this._columns, cards.length);
    // In edit mode, every card is shown inside a wrapper
    const shown = cards.map(
      (card) => (editMode && !this.isStrategy) || !card.hidden
    );

    // Whether a frame could render before the first card is added
    let framePassed = false;
    nextRender().then(() => {
      framePassed = true;
    });

    // Request every card size at once, so slow sizes don't add up
    const sizes: (number | undefined)[] = new Array(cards.length);
    let sizeKnown: (() => void) | undefined;
    const setSize = (index: number, size: number) => {
      if (sizes[index] === undefined) {
        sizes[index] = Number(size);
        sizeKnown?.();
      }
    };
    // Not computeCardSize(), whose 500 ms timeout would start now for every
    // card. hui-card already falls back to size 1 when a size fails.
    cards.forEach((card, index) => {
      Promise.resolve(card.getCardSize()).then((size) => setSize(index, size));
    });
    let nextCard = -1;
    let nextCardTimeout: number | undefined;

    let columnElements: HTMLDivElement[] | undefined;
    // Track the number of cards placed in a column
    const columnCardCounts: number[] = [];
    let placedCards = 0;

    const addColumns = ({ count, held }: ColumnsDecision) => {
      columnElements = [];
      for (let i = 0; i < count; i++) {
        let columnEl = root.children[i] as HTMLDivElement | undefined;
        if (!columnEl) {
          columnEl = document.createElement("div");
          columnEl.classList.add("column");
          root.appendChild(columnEl);
        }
        columnElements.push(columnEl);
        columnCardCounts.push(0);
      }
      // Columns that get a shown card keep their width while placing. The
      // marks of an earlier placement stay until this decision.
      Array.from(root.children).forEach((column, i) => {
        column.classList.toggle("placing", held.includes(i));
      });
    };

    let tillNextRender: Promise<unknown> | undefined;
    let start: Date | undefined;
    // On an empty view, when sizes were slow, render the first card on its
    // own: slow sizes often arrive together. With sizes known right away, a
    // pause would let other startup work delay the next cards.
    let paintFirstCard = !root.querySelector(
      ":scope > .column > :not([hidden])"
    );
    let firstCardRender: Promise<unknown> | undefined;

    // Add the cards with a known column to the DOM. Returns false when
    // another placement has started meanwhile.
    const placeCards = async (columns: number[]): Promise<boolean> => {
      while (placedCards < columns.length) {
        if (tillNextRender === undefined) {
          tillNextRender = nextRender().then(() => {
            tillNextRender = undefined;
            start = undefined;
          });
        }
        let waitProm: Promise<unknown> | undefined;
        // We should work for max 16ms (60fps) before allowing a frame to render
        if (start === undefined) {
          // Save the time we start for this frame, no need to wait yet
          start = new Date();
        } else if (new Date().getTime() - start.getTime() > 16) {
          // We are working too long, we will prevent a render, wait to allow for a render
          waitProm = tillNextRender;
        }
        // Like awaiting a card size, this also lets the previously added
        // card update before the next time check
        // eslint-disable-next-line no-await-in-loop
        await Promise.all([waitProm, firstCardRender]);
        if (iteration !== this._createColumnsIteration) {
          return false;
        }
        const index = placedCards++;
        const columnIndex = columns[index];
        this._addCardToColumn(
          columnElements![columnIndex],
          index,
          editMode,
          columnCardCounts[columnIndex]++
        );
        if (paintFirstCard && shown[index]) {
          paintFirstCard = false;
          if (framePassed) {
            firstCardRender = nextRender();
          }
        }
        if (columnElements!.some((column) => column.isConnected)) {
          this._resolveInitialRender?.();
          this._resolveInitialRender = undefined;
        }
      }
      return true;
    };

    try {
      for (;;) {
        // In which column every card goes, as far as the sizes are known
        const columns = assignColumns(sizes, maxColumns);
        if (!columnElements) {
          const decision = decideColumns(sizes, shown, maxColumns);
          if (decision) {
            addColumns(decision);
          }
        }
        if (columnElements) {
          // eslint-disable-next-line no-await-in-loop
          if (!(await placeCards(columns))) {
            return;
          }
          if (placedCards === cards.length) {
            break;
          }
        }
        if (sizes[columns.length] === undefined) {
          if (nextCard !== columns.length) {
            // As before, wait at most 500 ms for the next card's size
            nextCard = columns.length;
            clearTimeout(nextCardTimeout);
            const index = nextCard;
            nextCardTimeout = window.setTimeout(() => setSize(index, 1), 500);
          }
          // Wait for any size: it can allow deciding the columns
          // eslint-disable-next-line no-await-in-loop
          await new Promise<void>((resolve) => {
            sizeKnown = resolve;
          });
          sizeKnown = undefined;
        }
        if (iteration !== this._createColumnsIteration) {
          return;
        }
      }
    } finally {
      clearTimeout(nextCardTimeout);
    }

    // Remove empty columns. Only a finished placement removes the placing
    // marks: a newer one keeps them until it has decided its columns.
    Array.from(root.children).forEach((column) => {
      if (!column.lastChild) {
        root.removeChild(column);
      }
      column.classList.remove("placing");
    });
  }

  private _addCardToColumn(columnEl, index, preview, position) {
    const card: HuiCard = this.cards[index];
    if (!preview || this.isStrategy) {
      card.preview = false;
      // Only move the card when it is not already in place
      const before = columnEl.children[position] ?? null;
      if (before !== card) {
        columnEl.insertBefore(card, before);
      }
    } else {
      const wrapper = document.createElement("hui-card-options");
      wrapper.hass = this.hass;
      wrapper.lovelace = this.lovelace;
      wrapper.path = [...this.path!, "cards", index];
      card.preview = true;
      wrapper.appendChild(card);
      columnEl.appendChild(wrapper);
    }
  }

  private _updateColumns() {
    const matchColumns = this.mqls.reduce(
      (cols, mql) => cols + Number(mql.matches),
      0
    );
    // Do -1 column if the menu is docked and open
    const newColumns = Math.max(
      1,
      matchColumns -
        Number(!this.narrow && this.hass!.dockedSidebar === "docked")
    );
    if (newColumns === this._columns) {
      return;
    }
    this._columns = newColumns;
    this._createColumns();
  }

  static styles = css`
    :host {
      display: block;
      padding-top: 4px;
    }

    hui-view-badges {
      display: block;
      margin: 4px 8px 4px 8px;
      font-size: var(--ha-font-size-s);
    }

    #columns {
      display: flex;
      flex-direction: row;
      justify-content: center;
      margin-left: 4px;
      margin-right: 4px;
    }

    #columns.edit-mode {
      margin-bottom: 72px;
    }

    .column {
      flex: 1 0 0;
      max-width: 500px;
      min-width: 0;
    }

    /* Fix for safari */
    .column:has(> *) {
      flex-grow: 1;
    }

    .column:not(:has(> *:not([hidden]))) {
      flex-grow: 0;
    }

    /* While cards are being placed, a column keeps its share as soon as it
       has a visible card, before the card is rendered */
    #columns > .column.placing {
      flex-grow: 1;
    }

    .column > *:not([hidden]) {
      display: block;
      margin: var(--masonry-view-card-margin, 4px 4px 8px);
    }

    ha-button {
      position: fixed;
      right: calc(16px + var(--safe-area-inset-right));
      bottom: calc(16px + var(--safe-area-inset-bottom));
      inset-inline-end: calc(16px + var(--safe-area-inset-right));
      inset-inline-start: initial;
      z-index: 1;
      --ha-button-box-shadow: var(--ha-box-shadow-l);
    }

    @media (max-width: 500px) {
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-masonry-view": MasonryView;
  }
}
