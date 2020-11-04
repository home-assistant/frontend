import "@material/mwc-fab/mwc-fab";
import { mdiPlus, mdiResizeBottomRight } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import "lit-grid-layout";
import { classMap } from "lit-html/directives/class-map";
import { v4 as uuidv4 } from "uuid";
import { computeRTL } from "../../../common/util/compute_rtl";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/entity/ha-state-label-badge";
import "../../../components/ha-svg-icon";
import type {
  LovelaceViewConfig,
  LovelaceViewElement,
} from "../../../data/lovelace";
import type { HomeAssistant } from "../../../types";
import { computeCardSize } from "../common/compute-card-size";
import { HuiCardOptions } from "../components/hui-card-options";
import { showCreateCardDialog } from "../editor/card-editor/show-create-card-dialog";
import type { Lovelace, LovelaceBadge, LovelaceCard } from "../types";
import { HuiGridCardOptions } from "./grid/hui-grid-card-options";

let editCodeLoaded = false;
const mediaQueryColumns = [2, 6, 9, 12];

interface LovelaceGridCard extends LovelaceCard, HuiGridCardOptions {
  key: string;
  grid?: {
    key: string;
    width: number;
    height: number;
    posX: number;
    posY: number;
  };
}

const RESIZE_HANDLE = document.createElement("div") as HTMLElement;
RESIZE_HANDLE.style.cssText =
  "width: 100%; height: 100%; cursor: se-resize; fill: var(--primary-text-color)";
RESIZE_HANDLE.innerHTML = `
  <svg
    viewBox="0 0 24 24"
    preserveAspectRatio="xMidYMid meet"
    focusable="false"
  >
    <g><path d=${mdiResizeBottomRight}></path></g>
  </svg>
`;

@customElement("hui-grid-view")
export class GridView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ attribute: false }) public cards: Array<LovelaceGridCard> = [];

  @property({ attribute: false }) public badges: LovelaceBadge[] = [];

  @internalProperty() private _columns?: number;

  @internalProperty() private _layout?: Array<{
    width: number;
    height: number;
    posX: number;
    posY: number;
    key: string;
  }>;

  @internalProperty() public _cards: {
    [key: string]: LovelaceCard | HuiCardOptions;
  } = {};

  private _config?: LovelaceViewConfig;

  private _createColumnsIteration = 0;

  private _mqls?: MediaQueryList[];

  public constructor() {
    super();
    this.addEventListener("iron-resize", (ev: Event) => ev.stopPropagation());
  }

  public setConfig(config: LovelaceViewConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    return html`
      <div
        id="badges"
        style=${this.badges.length > 0 ? "display: block" : "display: none"}
      >
        ${this.badges.map((badge) => html`${badge}`)}
      </div>
      <lit-grid-layout
        rowHeight="15"
        .resizeHandle=${RESIZE_HANDLE}
        .itemRenderer=${this._itemRenderer}
        .layout=${this._layout}
        .columns=${this._columns}
        .dragDisabled=${!this.lovelace?.editMode}
        .resizeDisabled=${!this.lovelace?.editMode}
        @layout-changed=${(ev) => console.log(ev.detail)}
      ></lit-grid-layout>
      ${this.lovelace?.editMode
        ? html`
            <mwc-fab
              class=${classMap({
                rtl: computeRTL(this.hass!),
              })}
              .title=${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.add"
              )}
              @click=${this._addCard}
            >
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            </mwc-fab>
          `
        : ""}
    `;
  }

  protected firstUpdated(): void {
    this._updateColumns = this._updateColumns.bind(this);
    this._mqls = [300, 600, 900, 1200].map((width) => {
      const mql = matchMedia(`(min-width: ${width}px)`);
      mql.addEventListener("change", this._updateColumns);
      return mql;
    });
    this._updateColumns();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (this.lovelace?.editMode && !editCodeLoaded) {
      editCodeLoaded = true;
      import(
        /* webpackChunkName: "grid-view-editable" */ "./grid/grid-view-editable"
      );
    }

    if (changedProperties.has("hass")) {
      const oldHass = changedProperties.get("hass") as HomeAssistant;

      if (
        (oldHass && this.hass!.dockedSidebar !== oldHass.dockedSidebar) ||
        (!oldHass && this.hass)
      ) {
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
      this._createLayout();
      this._createCards();
    }
  }

  private _itemRenderer = (key: string): TemplateResult => {
    if (!this._cards) {
      return html``;
    }

    return html`${this._cards[key]}`;
  };

  private _addCard(): void {
    showCreateCardDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      saveConfig: this.lovelace!.saveConfig,
      path: [this.index!],
    });
  }

  private async _createLayout() {
    this._createColumnsIteration++;
    const iteration = this._createColumnsIteration;

    if (this._layout?.length) {
      return;
    }

    const cards = {};

    const newLayout: Array<{
      width: number;
      height: number;
      posX: number;
      posY: number;
      key: string;
      minHeight: number;
    }> = [];

    let tillNextRender: Promise<unknown> | undefined;
    let start: Date | undefined;

    // Calculate the size of every card and determine in what column it should go
    for (const [index, card] of this.cards.entries()) {
      const cardConfig = this._config!.cards![index];
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

      const cardSizeProm = computeCardSize(card);
      // @ts-ignore
      // eslint-disable-next-line no-await-in-loop
      const [cardSize] = await Promise.all([cardSizeProm, waitProm]);

      if (iteration !== this._createColumnsIteration) {
        // An other create columns is started, abort this one
        return;
      }

      const layout = {
        width: 3,
        height: cardSize,
        key: uuidv4(),
        minHeight: 4,
        ...cardConfig.layout,
      };

      cards[layout.key] = { card, index };

      newLayout.push(layout);
    }

    // const cards = this._config!.cards!.map((conf, idx) => {
    //   return { ...conf, layout: newLayout[idx] };
    // });

    // this.lovelace?.saveConfig(
    //   replaceView(this.lovelace.config, this.index!, {
    //     ...this._config!,
    //     cards,
    //   })
    // );

    this._layout = newLayout;
    this._createCards();
  }

  private _createCards(): void {
    const elements = {};
    this.cards.forEach((card: LovelaceGridCard, index) => {
      const layout = this._layout![index];

      card.editMode = this.lovelace?.editMode;
      let element = card;

      if (this.lovelace?.editMode) {
        const wrapper = document.createElement(
          "hui-grid-card-options"
        ) as LovelaceGridCard;
        wrapper.hass = this.hass;
        wrapper.lovelace = this.lovelace;
        wrapper.path = [this.index!, index];
        wrapper.appendChild(card);
        element = wrapper;
      }

      elements[layout.key] = element;
    });

    this._cards = elements;
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
    this._columns = Math.max(1, mediaQueryColumns[matchColumns - 1]);
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

      lit-grid-layout {
        --placeholder-background-color: var(--accent-color);
        --resize-handle-size: 32px;
      }

      #badges {
        margin: 8px 16px;
        font-size: 85%;
        text-align: center;
      }

      mwc-fab {
        position: sticky;
        float: right;
        right: calc(16px + env(safe-area-inset-right));
        bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: 5;
      }

      mwc-fab.rtl {
        float: left;
        right: auto;
        left: calc(16px + env(safe-area-inset-left));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-grid-view": GridView;
  }
}
