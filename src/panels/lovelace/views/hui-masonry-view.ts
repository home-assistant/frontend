import { mdiPlus } from "@mdi/js";
import {
  css,
  CSSResult,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { computeRTL } from "../../../common/util/compute_rtl";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/entity/ha-state-label-badge";
import "../../../components/ha-svg-icon";
import type {
  LovelaceViewConfig,
  LovelaceViewElement,
} from "../../../data/lovelace";
import type { HomeAssistant } from "../../../types";
import type { HuiErrorCard } from "../cards/hui-error-card";
import { computeCardSize } from "../common/compute-card-size";
import { showCreateCardDialog } from "../editor/card-editor/show-create-card-dialog";
import type { Lovelace, LovelaceBadge, LovelaceCard } from "../types";

let editCodeLoaded = false;

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

  @property({ type: Number }) public index?: number;

  @property({ attribute: false }) public cards: Array<
    LovelaceCard | HuiErrorCard
  > = [];

  @property({ attribute: false }) public badges: LovelaceBadge[] = [];

  @internalProperty() private _columns?: number;

  private _createColumnsIteration = 0;

  private _mqls?: MediaQueryList[];

  public constructor() {
    super();
    this.addEventListener("iron-resize", (ev: Event) => ev.stopPropagation());
  }

  public setConfig(_config: LovelaceViewConfig): void {}

  protected render(): TemplateResult {
    return html`
      <div
        id="badges"
        style=${this.badges.length > 0 ? "display: block" : "display: none"}
      >
        ${this.badges.map((badge) => html`${badge}`)}
      </div>
      <div id="columns"></div>
      ${this.lovelace?.editMode
        ? html`
            <mwc-fab
              title=${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.add"
              )}
              @click=${this._addCard}
              class=${classMap({
                rtl: computeRTL(this.hass!),
              })}
            >
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            </mwc-fab>
          `
        : ""}
    `;
  }

  protected firstUpdated(): void {
    this._mqls = [300, 600, 900, 1200].map((width) => {
      const mql = window.matchMedia(`(min-width: ${width}px)`);
      mql.addListener(() => this._updateColumns());
      return mql;
    });
    this._updateColumns();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (this.lovelace?.editMode && !editCodeLoaded) {
      editCodeLoaded = true;
      import(
        /* webpackChunkName: "default-layout-editable" */ "./default-view-editable"
      );
    }

    if (changedProperties.has("hass")) {
      const oldHass = changedProperties.get("hass") as HomeAssistant;

      if (oldHass && this.hass!.dockedSidebar !== oldHass.dockedSidebar) {
        this._updateColumns();
      }

      if (changedProperties.size === 1) {
        return;
      }
    }

    const oldLovelace = changedProperties.get("lovelace") as
      | Lovelace
      | undefined;

    if (
      (changedProperties.has("lovelace") &&
        (oldLovelace?.config !== this.lovelace?.config ||
          oldLovelace?.editMode !== this.lovelace?.editMode)) ||
      changedProperties.has("_columns")
    ) {
      this._createColumns();
    }
  }

  private _addCard(): void {
    showCreateCardDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      saveConfig: this.lovelace!.saveConfig,
      path: [this.index!],
    });
  }

  private async _createColumns() {
    if (!this._columns) {
      return;
    }

    this._createColumnsIteration++;
    const iteration = this._createColumnsIteration;
    const root = this.shadowRoot!.getElementById("columns")!;

    // Remove old columns
    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    // Track the total height of cards in a columns
    const columnSizes: number[] = [];
    const columnElements: HTMLDivElement[] = [];
    // Add columns to DOM, limit number of columns to the number of cards
    for (let i = 0; i < Math.min(this._columns, this.cards.length); i++) {
      const columnEl = document.createElement("div");
      columnEl.classList.add("column");
      root.appendChild(columnEl);
      columnSizes.push(0);
      columnElements.push(columnEl);
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
      // Calculate in wich column the card should go based on the size and the cards already in there
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

  private _addCardToColumn(columnEl, index, editMode) {
    const card: LovelaceCard = this.cards[index];
    if (!editMode) {
      card.editMode = false;
      columnEl.appendChild(card);
    } else {
      const wrapper = document.createElement("hui-card-options");
      wrapper.hass = this.hass;
      wrapper.lovelace = this.lovelace;
      wrapper.path = [this.index!, index];
      card.editMode = true;
      wrapper.appendChild(card);
      columnEl.appendChild(wrapper);
    }
  }

  private _updateColumns() {
    if (!this._mqls) {
      return;
    }
    const matchColumns = this._mqls!.reduce(
      (cols, mql) => cols + Number(mql.matches),
      0
    );
    // Do -1 column if the menu is docked and open
    this._columns = Math.max(
      1,
      matchColumns - Number(this.hass!.dockedSidebar === "docked")
    );
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        padding-top: 4px;
        height: 100%;
        box-sizing: border-box;
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
        margin-left: 4px;
        margin-right: 4px;
      }

      .column {
        flex: 1 0 0;
        max-width: 500px;
        min-width: 0;
      }

      .column > * {
        display: block;
        margin: 4px 4px 8px;
      }

      mwc-fab {
        position: sticky;
        float: right;
        right: calc(16px + env(safe-area-inset-right));
        bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: 1;
      }

      mwc-fab.rtl {
        float: left;
        right: auto;
        left: calc(16px + env(safe-area-inset-left));
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-masonry-view": MasonryView;
  }
}

customElements.define("hui-masonry-view", MasonryView);
