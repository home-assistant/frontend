import { mdiCursorMove, mdiDelete, mdiPencil, mdiPlus } from "@mdi/js";
import { GridStack, GridStackWidget } from "gridstack";
import gridStackStyleExtra from "gridstack/dist/gridstack-extra.min.css";
import gridStackStyle from "gridstack/dist/gridstack.min.css";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
  unsafeCSS,
} from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/entity/ha-state-label-badge";
import "../../../components/ha-svg-icon";
import type { LovelaceViewElement } from "../../../data/lovelace";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { HuiErrorCard } from "../cards/hui-error-card";
import { createCardElement } from "../custom-card-helpers";
import { replaceView } from "../editor/config-util";
import type { Lovelace, LovelaceBadge, LovelaceCard } from "../types";

@customElement("hui-manual-view")
export class ManualView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Number }) public index?: number;

  @property({ type: Boolean }) public isStrategy = false;

  @property({ attribute: false }) public cards: Array<
    LovelaceCard | HuiErrorCard
  > = [];

  @property({ attribute: false }) public badges: LovelaceBadge[] = [];

  public setConfig(_config: LovelaceViewConfig): void {}

  private _grid?: GridStack;

  connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._setupGrid();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._grid?.destroy(false);
    this._grid = undefined;
  }

  protected render(): TemplateResult {
    return html`
      ${this.badges.length > 0
        ? html`<div class="badges">${this.badges}</div>`
        : ""}
      <div class="grid-stack">
        ${this.cards.map(
          (card, i) =>
            html`<div class="grid-stack-item" gs-id=${i}>
              ${this.lovelace?.editMode
                ? html` <div class="controls">
                    <ha-svg-icon
                      class="handle"
                      .path=${mdiCursorMove}
                    ></ha-svg-icon>
                    <ha-icon-button
                      @click=${this._editCard}
                      .path=${mdiPencil}
                      .index=${i}
                    ></ha-icon-button>
                    <ha-icon-button
                      @click=${this._deleteCard}
                      .index=${i}
                      class="warning"
                      .path=${mdiDelete}
                    ></ha-icon-button>
                  </div>`
                : nothing}
              <div class="grid-stack-item-content">${card}</div>
            </div>`
        )}
      </div>
      ${this.lovelace?.editMode
        ? html`
            <ha-fab
              .label=${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.add"
              )}
              extended
              @click=${this._addCard}
              class=${classMap({
                rtl: computeRTL(this.hass!),
              })}
            >
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            </ha-fab>
          `
        : ""}
    `;
  }

  firstUpdated(changed) {
    super.firstUpdated(changed);
    this._setupGrid();
  }

  updated(changedProperties: PropertyValues) {
    if (
      changedProperties.has("lovelace") &&
      this.lovelace?.editMode !== changedProperties.get("lovelace")?.editMode
    ) {
      if (this.lovelace?.editMode) {
        this._grid!.setStatic(false);
        this._grid!.setAnimation(true);
        // this.grid.addWidget(
        //   '<div class="grid-stack-item"><div class="grid-stack-item-content">hello</div></div>',
        //   { w: 3 }
        // );
      } else {
        this._grid!.setStatic(true);
        this._grid!.setAnimation(false);
      }
    }

    if (
      changedProperties.has("cards") &&
      changedProperties.get("cards") &&
      !this.lovelace?.editMode
    ) {
      this._grid!.load(
        (
          this.lovelace?.config.views[this.index!] as LovelaceViewConfig
        ).cards?.map((card, i) => ({
          id: i.toString(),
          ...card.view_layout,
        })) || [],
        false
      );
    }
  }

  public willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);

    if (
      changedProperties.has("lovelace") &&
      this.lovelace?.editMode !== changedProperties.get("lovelace")?.editMode
    ) {
      if (this.lovelace?.editMode) {
        import("./default-view-editable");
      } else if (this._grid) {
        this._saveLayout();
      }
    }

    if (changedProperties.has("hass")) {
      const oldHass = changedProperties.get("hass") as
        | HomeAssistant
        | undefined;

      if (this.hass!.dockedSidebar !== oldHass?.dockedSidebar) {
        // this._updateColumns();
        return;
      }
    }

    if (changedProperties.has("narrow")) {
      // this._updateColumns();
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
      // this._createColumns();
    }
  }

  private async _editCard(ev): Promise<void> {
    const index = ev.target.index;
    fireEvent(this, "ll-edit-card", { path: [this.index!, index] });
  }

  private async _deleteCard(ev): Promise<void> {
    const index = ev.target.index;
    fireEvent(this, "ll-delete-card", {
      path: [this.index!, index],
      confirm: true,
    });
  }

  private async _addCard(): Promise<void> {
    fireEvent(this, "ll-create-card", {
      preSaveConfig: async (config) => {
        const card = createCardElement(config);
        const height = await card.getCardSize();
        const add = this._grid!.addWidget({
          w: 3,
          h: height,
          content: "",
        });
        return {
          ...config,
          view_layout: {
            x: add.gridstackNode!.x,
            y: add.gridstackNode!.y,
            w: add.gridstackNode!.w,
            h: add.gridstackNode!.h,
          },
        };
      },
    });
  }

  private async _saveLayout(): Promise<void> {
    if (!this._grid || !this.lovelace?.editMode) {
      return;
    }
    const layouts = this._grid.save(false) as GridStackWidget[];
    layouts
      .sort((a, b) => Number(a.id!) - Number(b.id!))
      .forEach((layout) => {
        delete layout.id;
      });
    const cardConfigs = (
      this.lovelace?.config.views[this.index!] as LovelaceViewConfig
    ).cards?.map((card, i) => ({
      ...card,
      view_layout: layouts[i],
    }));
    await this.lovelace!.saveConfig(
      replaceView(this.hass!, this.lovelace!.config, this.index!, {
        ...this.lovelace!.config.views[this.index!],
        cards: cardConfigs,
      })
    );
  }

  private _setupGrid(): void {
    this._grid = GridStack.init(
      {
        cellHeight: 60,
        animate: false,
        columnOpts: {
          layout: "moveScale",
          // breakpointForWindow: true, // test window vs grid size
          breakpoints: [
            { w: 700, c: 1 },
            { w: 850, c: 4 },
            { w: 950, c: 8 },
            { w: 1100, c: 12 },
          ],
        },
        minRow: 5,
        sizeToContent: false,
        handleClass: "handle",
        staticGrid: true,
        margin: 4,
      },
      this.shadowRoot!.querySelector(".grid-stack") as HTMLElement
    );
    this._grid.load(
      (
        this.lovelace?.config.views[this.index!] as LovelaceViewConfig
      ).cards?.map((card, i) => ({
        id: i.toString(),
        ...card.view_layout,
      })) || [],
      false
    );
    this._grid.on("dragstop resizestop", () => {
      this._saveLayout();
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ${unsafeCSS(gridStackStyle)}
      ${unsafeCSS(gridStackStyleExtra)}
      :host {
        display: block;
        padding-top: 4px;
      }
      .grid-stack {
        height: 100vh;
        margin: 4px;
      }
      .grid-stack-item {
        position: relative;
      }

    .controls {
      display: none;
      z-index: 999;
=    }

    .grid-stack-item:hover .controls {
      position: absolute;
      display: flex;
      top: 8px;
      right: 8px;
    }

    .handle {
      width: 24px;
      height: 24px;
      padding: 12px;
      cursor: move; /* fallback if grab cursor is unsupported */
          cursor: grab !important;    
        }


      .badges {
        margin: 8px 16px;
        font-size: 85%;
        text-align: center;
      }
      ha-fab {
        position: fixed;
        right: calc(16px + env(safe-area-inset-right));
        bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: 1;
      }

      ha-fab.rtl {
        right: auto;
        left: calc(16px + env(safe-area-inset-left));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-manual-view": ManualView;
  }
}
