import { mdiPlus } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/entity/ha-state-label-badge";
import "../../../components/ha-svg-icon";
import type { LovelaceViewElement } from "../../../data/lovelace";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { HuiBadge } from "../badges/hui-badge";
import "../badges/hui-view-badges";
import type { HuiCard } from "../cards/hui-card";
import { computeCardSize } from "../common/compute-card-size";
import type { Lovelace } from "../types";

// Find column with < 5 size, else smallest column
const getColumnIndex = (columnSizes: number[], size: number) => {
  let minIndex = 0;
  for (let i = 0; i < columnSizes.length; i++) {
    if (columnSizes[i] < 5) {
      minIndex = i;
      break;
    }
    if (columnSizes[i] < columnSizes[minIndex]) {
      minIndex = i;
    }
  }

  columnSizes[minIndex] += size;

  return minIndex;
};

export class MasonryView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Number }) public index?: number;

  @property({ attribute: false }) public isStrategy = false;

  @property({ attribute: false }) public cards: HuiCard[] = [];

  @property({ attribute: false }) public badges: HuiBadge[] = [];

  @state() private _columns?: number;

  private _createColumnsIteration = 0;

  private _mqls?: MediaQueryList[];

  private _mqlListenerRef?: () => void;

  public connectedCallback() {
    super.connectedCallback();
    this._initMqls();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._mqls?.forEach((mql) => {
      mql.removeListener(this._mqlListenerRef!);
    });
    this._mqlListenerRef = undefined;
    this._mqls = undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public setConfig(_config: LovelaceViewConfig): void {}

  protected render(): TemplateResult {
    return html`
      <hui-view-badges
        .hass=${this.hass}
        .badges=${this.badges}
        .lovelace=${this.lovelace}
        .viewIndex=${this.index}
        show-add-label
      ></hui-view-badges>
      <div
        id="columns"
        class=${this.lovelace?.editMode ? "edit-mode" : ""}
      ></div>
      ${this.lovelace?.editMode
        ? html`
            <ha-fab
              .label=${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.add"
              )}
              extended
              @click=${this._addCard}
            >
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            </ha-fab>
          `
        : ""}
    `;
  }

  private _initMqls() {
    this._mqls = [300, 600, 900, 1200].map((width) => {
      const mql = window.matchMedia(`(min-width: ${width}px)`);
      if (!this._mqlListenerRef) {
        this._mqlListenerRef = this._updateColumns.bind(this);
      }
      mql.addListener(this._mqlListenerRef);
      return mql;
    });
  }

  private get mqls(): MediaQueryList[] {
    if (!this._mqls) {
      this._initMqls();
    }
    return this._mqls!;
  }

  public willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);

    if (this.lovelace?.editMode) {
      import("./default-view-editable");
    }

    if (changedProperties.has("hass")) {
      const oldHass = changedProperties.get("hass") as
        | HomeAssistant
        | undefined;

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
      | Lovelace
      | undefined;

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
    fireEvent(this, "ll-create-card");
  }

  private _createRootElement(columns: HTMLDivElement[]) {
    const root = this.shadowRoot!.getElementById("columns") as HTMLDivElement;

    // Remove old columns
    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    columns.forEach((column) => root.appendChild(column));
  }

  private async _createColumns() {
    if (!this._columns) {
      return;
    }

    this._createColumnsIteration++;
    const iteration = this._createColumnsIteration;

    // Track the total height of cards in a columns
    const columnSizes: number[] = [];
    const columnElements: HTMLDivElement[] = [];
    // Add columns to DOM, limit number of columns to the number of cards
    for (let i = 0; i < Math.min(this._columns, this.cards.length); i++) {
      const columnEl = document.createElement("div");
      columnEl.classList.add("column");
      columnSizes.push(0);
      columnElements.push(columnEl);
    }

    if (!this.hasUpdated) {
      this.updateComplete.then(() => {
        this._createRootElement(columnElements);
      });
    } else {
      this._createRootElement(columnElements);
    }

    let tillNextRender: Promise<unknown> | undefined;
    let start: Date | undefined;

    // Calculate the size of every card and determine in what column it should go
    for (const [index, el] of this.cards.entries()) {
      if (tillNextRender === undefined) {
        // eslint-disable-next-line no-loop-func
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

      const cardSizeProm = computeCardSize(el);
      // @ts-ignore
      // eslint-disable-next-line no-await-in-loop
      const [cardSize] = await Promise.all([cardSizeProm, waitProm]);

      if (iteration !== this._createColumnsIteration) {
        // An other create columns is started, abort this one
        return;
      }
      // Calculate in which column the card should go based on the size and the cards already in there
      this._addCardToColumn(
        columnElements[getColumnIndex(columnSizes, cardSize as number)],
        index,
        this.lovelace!.editMode
      );
    }

    // Remove empty columns
    columnElements.forEach((column) => {
      if (!column.lastChild) {
        column.parentElement!.removeChild(column);
      }
    });
  }

  private _addCardToColumn(columnEl, index, preview) {
    const card: HuiCard = this.cards[index];
    if (!preview || this.isStrategy) {
      card.preview = false;
      columnEl.appendChild(card);
    } else {
      const wrapper = document.createElement("hui-card-options");
      wrapper.hass = this.hass;
      wrapper.lovelace = this.lovelace;
      wrapper.path = [this.index!, index];
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

    .column > *:not([hidden]) {
      display: block;
      margin: var(--masonry-view-card-margin, 4px 4px 8px);
    }

    ha-fab {
      position: fixed;
      right: calc(16px + var(--safe-area-inset-right));
      bottom: calc(16px + var(--safe-area-inset-bottom));
      inset-inline-end: calc(16px + var(--safe-area-inset-right));
      inset-inline-start: initial;
      z-index: 1;
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

customElements.define("hui-masonry-view", MasonryView);
