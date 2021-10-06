import { mdiDrag, mdiDotsVertical } from "@mdi/js";
import "@polymer/paper-checkbox/paper-checkbox";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-input/paper-textarea";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { ActionDetail } from "@material/mwc-list";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { guard } from "lit/directives/guard";
import { repeat } from "lit/directives/repeat";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../../../components/ha-button-menu";
import {
  addItem,
  clearItems,
  fetchItems,
  reorderItems,
  ShoppingListItem,
  updateItem,
} from "../../../data/shopping-list";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { SensorCardConfig, ShoppingListCardConfig } from "./types";

let Sortable;

@customElement("hui-shopping-list-card")
class HuiShoppingListCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-shopping-list-editor");
    return document.createElement("hui-shopping-list-card-editor");
  }

  public static getStubConfig(): ShoppingListCardConfig {
    return { type: "shopping-list" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ShoppingListCardConfig;

  @state() private _uncheckedItems?: ShoppingListItem[];

  @state() private _checkedItems?: ShoppingListItem[];

  @state() private _reordering = false;

  @state() private _renderEmptySortable = false;

  private _sortable?;

  @query("#sortable") private _sortableEl?: HTMLElement;

  public getCardSize(): number {
    return (this._config ? (this._config.title ? 2 : 0) : 0) + 3;
  }

  public setConfig(config: ShoppingListCardConfig): void {
    this._config = config;
    this._uncheckedItems = [];
    this._checkedItems = [];
  }

  public hassSubscribe(): Promise<UnsubscribeFunc>[] {
    this._fetchData();
    return [
      this.hass!.connection.subscribeEvents(
        () => this._fetchData(),
        "shopping_list_updated"
      ),
    ];
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | SensorCardConfig
      | undefined;

    if (
      (changedProps.has("hass") && oldHass?.themes !== this.hass.themes) ||
      (changedProps.has("_config") && oldConfig?.theme !== this._config.theme)
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <ha-card
        .header=${this._config.title}
        class=${classMap({
          "has-header": "title" in this._config,
        })}
      >
        <div class="card-content">
          <div class="addRow">
            <paper-checkbox
              tabindex="0"
              ?disabled=${this._uncheckedItems?.length === 0 &&
              this._checkedItems?.length === 0}
            ></paper-checkbox>
            ${html`<paper-textarea
              no-label-float
              class="addBox"
              placeholder=${this.hass!.localize(
                "ui.panel.lovelace.cards.shopping-list.add_item"
              )}
              @paste=${this._handlePaste}
              @keydown=${this._handleKeyPress}
            ></paper-textarea>`}
            <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
              <mwc-icon-button slot="trigger">
                <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
              </mwc-icon-button>
              <mwc-list-item>
                ${this.hass!.localize(
                  "ui.panel.lovelace.cards.shopping-list.clear_items"
                )}
              </mwc-list-item>
              <mwc-list-item
                >${this._reordering
                  ? this.hass!.localize(
                      "ui.panel.lovelace.cards.shopping-list.hide_reordering_tool"
                    )
                  : this.hass!.localize(
                      "ui.panel.lovelace.cards.shopping-list.show_reordering_tool"
                    )}
              </mwc-list-item>
            </ha-button-menu>
          </div>
          ${this._reordering
            ? html`
                <div id="sortable">
                  ${guard(
                    [this._uncheckedItems, this._renderEmptySortable],
                    () =>
                      this._renderEmptySortable
                        ? ""
                        : this._renderItems(this._uncheckedItems!)
                  )}
                </div>
              `
            : this._renderItems(this._uncheckedItems!)}
          ${this._checkedItems!.length > 0
            ? html`
                ${repeat(
                  this._checkedItems!,
                  (item) => item.id,
                  (item) =>
                    html`
                      <div class="editRow">
                        <paper-checkbox
                          tabindex="0"
                          ?checked=${item.complete}
                          .itemId=${item.id}
                          @click=${this._completeItem}
                        ></paper-checkbox>
                        <paper-input
                          no-label-float
                          .value=${item.name}
                          .itemId=${item.id}
                          @change=${this._saveEdit}
                        ></paper-input>
                      </div>
                    `
                )}
              `
            : ""}
        </div>
      </ha-card>
    `;
  }

  private _renderItems(items: ShoppingListItem[]) {
    return html`
      ${repeat(
        items,
        (item) => item.id,
        (item) =>
          html`
            <div class="editRow" item-id=${item.id}>
              <paper-checkbox
                tabindex="0"
                ?checked=${item.complete}
                .itemId=${item.id}
                @click=${this._completeItem}
              ></paper-checkbox>
              <paper-input
                no-label-float
                .value=${item.name}
                .itemId=${item.id}
                @change=${this._saveEdit}
              ></paper-input>
              ${this._reordering
                ? html`
                    <ha-svg-icon
                      .title=${this.hass!.localize(
                        "ui.panel.lovelace.cards.shopping-list.drag_and_drop"
                      )}
                      class="reorderButton"
                      .path=${mdiDrag}
                    >
                    </ha-svg-icon>
                  `
                : ""}
            </div>
          `
      )}
    `;
  }

  private async _fetchData(): Promise<void> {
    if (!this.hass) {
      return;
    }
    const checkedItems: ShoppingListItem[] = [];
    const uncheckedItems: ShoppingListItem[] = [];
    const items = await fetchItems(this.hass);
    for (const key in items) {
      if (items[key].complete) {
        checkedItems.push(items[key]);
      } else {
        uncheckedItems.push(items[key]);
      }
    }
    this._checkedItems = checkedItems;
    this._uncheckedItems = uncheckedItems;
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._clearItems();
        break;
      case 1:
        this._toggleReorder();
        break;
    }
  }

  private _completeItem(ev): void {
    updateItem(this.hass!, ev.target.itemId, {
      complete: ev.target.checked,
    }).catch(() => this._fetchData());
  }

  private _saveEdit(ev): void {
    updateItem(this.hass!, ev.target.itemId, {
      name: ev.target.value,
    }).catch(() => this._fetchData());

    ev.target.blur();
  }

  private _clearItems(): void {
    if (this.hass) {
      clearItems(this.hass).catch(() => this._fetchData());
    }
  }

  private get _newItem(): PaperInputElement {
    return this.shadowRoot!.querySelector(".addBox") as PaperInputElement;
  }

  private _addItem(item: string): void {
    const newItem = this._newItem;
    if (item.length > 0) {
      addItem(this.hass!, item).catch(() => this._fetchData());
    }

    newItem.value = "";
  }

  private _setUpList(input: string[]): void {
    for (const item of input) {
      const trimmed = item.trim();
      if (trimmed !== "") {
        this._addItem(trimmed);
      }
    }
  }

  private _splitOnLineBreaks(input: string) {
    if (input !== "") {
      const splittedOnLinebreaks = input.split("\n");
      this._setUpList(splittedOnLinebreaks);
    }
  }

  private _handlePaste(ev: {
    clipboardData: { getData: (arg0: string) => string };
  }): void {
    this._splitOnLineBreaks(ev.clipboardData.getData("text"));
  }

  private _handleKeyPress(ev: {
    keyCode: number;
    shiftKey: boolean;
    preventDefault: () => void;
  }): void {
    const inputContent = this._newItem.value;
    if (ev.keyCode === 13 && !ev.shiftKey) {
      ev.preventDefault();
      if (inputContent) {
        this._splitOnLineBreaks(inputContent);
      }
    }
    if (ev.keyCode === 13 && ev.shiftKey && !inputContent) {
      ev.preventDefault();
    }
  }

  private async _toggleReorder() {
    if (!Sortable) {
      const sortableImport = await import(
        "sortablejs/modular/sortable.core.esm"
      );
      Sortable = sortableImport.Sortable;
    }
    this._reordering = !this._reordering;
    await this.updateComplete;
    if (this._reordering) {
      this._createSortable();
    } else {
      this._sortable?.destroy();
      this._sortable = undefined;
    }
  }

  private _createSortable() {
    const sortableEl = this._sortableEl;
    this._sortable = new Sortable(sortableEl, {
      animation: 150,
      fallbackClass: "sortable-fallback",
      dataIdAttr: "item-id",
      handle: "ha-svg-icon",
      onEnd: async (evt) => {
        // Since this is `onEnd` event, it's possible that
        // an item wa dragged away and was put back to its original position.
        if (evt.oldIndex !== evt.newIndex) {
          reorderItems(this.hass!, this._sortable.toArray()).catch(() =>
            this._fetchData()
          );
          // Move the shopping list item in memory.
          this._uncheckedItems!.splice(
            evt.newIndex,
            0,
            this._uncheckedItems!.splice(evt.oldIndex, 1)[0]
          );
        }
        this._renderEmptySortable = true;
        await this.updateComplete;
        while (sortableEl?.lastElementChild) {
          sortableEl.removeChild(sortableEl.lastElementChild);
        }
        this._renderEmptySortable = false;
      },
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        height: 100%;
        box-sizing: border-box;
      }

      .has-header {
        padding-top: 0;
      }

      .editRow,
      .addRow,
      .checked,
      .input-mode,
      .input-mode .item {
        display: flex;
        align-items: center;
      }

      .card-content {
        margin-top: 0;
      }

      .input-mode .item {
        cursor: pointer;
        color: var(--secondary-text-color);
        font-weight: 500;
      }

      .input-mode .item.active,
      .input-mode .item:hover {
        color: var(--primary-text-color);
      }

      .input-mode .item.active:hover {
        cursor: auto;
      }

      .input-mode .item:first-of-type {
        margin: 0 28px 0 0;
      }

      .input-mode {
        margin-bottom: 24px;
      }

      .input-mode ha-svg-icon {
        --mdc-icon-size: 18px;
        padding-right: 4px;
      }

      .addButton {
        padding-right: 16px;
        cursor: pointer;
      }

      .reorderButton {
        padding: 12px;
        cursor: pointer;
      }

      paper-checkbox {
        padding-left: 4px;
        padding-right: 20px;
        --paper-checkbox-label-spacing: 0px;
      }

      paper-input,
      paper-textarea {
        flex-grow: 1;
      }

      .checked {
        margin: 12px 0;
        justify-content: space-between;
      }

      .checked span {
        color: var(--primary-text-color);
        font-weight: 500;
      }

      .clearall {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shopping-list-card": HuiShoppingListCard;
  }
}
