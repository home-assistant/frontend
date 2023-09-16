import { mdiDrag, mdiNotificationClearAll, mdiPlus, mdiSort } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { guard } from "lit/directives/guard";
import { repeat } from "lit/directives/repeat";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import "../../../components/ha-card";
import "../../../components/ha-checkbox";
import "../../../components/ha-svg-icon";
import "../../../components/ha-textfield";
import "../../../components/ha-list-item";
import "../../../components/ha-select";
import type { HaTextField } from "../../../components/ha-textfield";

import {
  getTodoLists,
  TodoList,
  TodoItem,
  fetchItems,
  TodoItemStatus,
  deleteItems,
  createItem,
  updateItem,
  moveItem,
} from "../../../data/todo";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import {
  loadSortable,
  SortableInstance,
} from "../../../resources/sortable.ondemand";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { SensorCardConfig, ShoppingListCardConfig } from "./types";

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

  @state() private _todoLists: TodoList[] = [];

  @state() private _entityId?: string;

  @state() private _items: Record<string, TodoItem> = {};

  @state() private _uncheckedItems?: TodoItem[];

  @state() private _checkedItems?: TodoItem[];

  @state() private _reordering = false;

  @state() private _renderEmptySortable = false;

  private _sortable?: SortableInstance;

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

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._todoLists = getTodoLists(this.hass!).filter(
        (todoList) =>
          !this._config ||
          !this._config!.entities ||
          this._config!.entities.length === 0 ||
          todoList.entity_id in this._config!.entities
      );
      if (!this._entityId && this._todoLists.length > 0) {
        this._entityId = this._todoLists[0].entity_id;
      }
    }
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

  protected render() {
    if (!this._config || !this.hass || !this._entityId) {
      return nothing;
    }

    return html`
      <ha-card
        .header=${this._config.title}
        class=${classMap({
          "has-header": "title" in this._config,
        })}
      >
        ${this._todoLists.length >= 0
          ? html`
              <ha-select
                class="todoList"
                label=${this.hass.localize(
                  "ui.panel.lovelace.cards.todo.lists"
                )}
                .value=${this._entityId}
                @selected=${this._selectTodoList}
                fixedMenuPosition
                naturalMenuWidth
              >
                ${this._todoLists!.map(
                  (item) => html`
                    <ha-list-item .value=${item.entity_id} .item=${item}>
                      ${item.name}
                    </ha-list-item>
                  `
                )}
              </ha-select>
            `
          : nothing}
        <div class="addRow">
          <ha-svg-icon
            class="addButton"
            .path=${mdiPlus}
            .title=${this.hass!.localize(
              "ui.panel.lovelace.cards.shopping-list.add_item"
            )}
            @click=${this._addItem}
          >
          </ha-svg-icon>
          <ha-textfield
            class="addBox"
            .placeholder=${this.hass!.localize(
              "ui.panel.lovelace.cards.shopping-list.add_item"
            )}
            @keydown=${this._addKeyPress}
          ></ha-textfield>
          <ha-svg-icon
            class="reorderButton"
            .path=${mdiSort}
            .title=${this.hass!.localize(
              "ui.panel.lovelace.cards.shopping-list.reorder_items"
            )}
            @click=${this._toggleReorder}
          >
          </ha-svg-icon>
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
              <div class="divider"></div>
              <div class="checked">
                <span>
                  ${this.hass!.localize(
                    "ui.panel.lovelace.cards.shopping-list.checked_items"
                  )}
                </span>
                <ha-svg-icon
                  class="clearall"
                  tabindex="0"
                  .path=${mdiNotificationClearAll}
                  .title=${this.hass!.localize(
                    "ui.panel.lovelace.cards.shopping-list.clear_items"
                  )}
                  @click=${this._clearCompletedItems}
                >
                </ha-svg-icon>
              </div>
              ${repeat(
                this._checkedItems!,
                (item) => item.uid,
                (item) => html`
                  <div class="editRow">
                    <ha-checkbox
                      tabindex="0"
                      .checked=${item.status === TodoItemStatus.Completed}
                      .itemId=${item.uid}
                      @change=${this._completeItem}
                    ></ha-checkbox>
                    <ha-textfield
                      class="item"
                      .value=${item.summary}
                      .itemId=${item.uid}
                      @change=${this._saveEdit}
                    ></ha-textfield>
                  </div>
                `
              )}
            `
          : ""}
      </ha-card>
    `;
  }

  private _renderItems(items: TodoItem[]) {
    return html`
      ${repeat(
        items,
        (item) => item.uid,
        (item) => html`
          <div class="editRow" item-id=${item.uid}>
            <ha-checkbox
              tabindex="0"
              .checked=${item.status === TodoItemStatus.Completed}
              .itemId=${item.uid}
              @change=${this._completeItem}
            ></ha-checkbox>
            <ha-textfield
              class="item"
              .value=${item.summary}
              .itemId=${item.uid}
              @change=${this._saveEdit}
            ></ha-textfield>
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
    if (!this.hass || !this._entityId) {
      return;
    }
    const checkedItems: TodoItem[] = [];
    const uncheckedItems: TodoItem[] = [];
    const items = await fetchItems(this.hass!, this._entityId!);
    const records: Record<string, TodoItem> = {};
    items.forEach((item) => {
      records[item.uid] = item;
      if (item.status === TodoItemStatus.Completed) {
        checkedItems.push(item);
      } else {
        uncheckedItems.push(item);
      }
    });
    this._items = records;
    this._checkedItems = checkedItems;
    this._uncheckedItems = uncheckedItems;
  }

  private _selectTodoList(ev): void {
    const todoList = this._todoLists[ev.detail.index];
    this._entityId = todoList.entity_id;
    this._fetchData();
  }

  private _completeItem(ev): void {
    const item = this._items[ev.target.itemId];
    updateItem(this.hass!, this._entityId!, {
      ...item,
      status: ev.target.checked
        ? TodoItemStatus.Completed
        : TodoItemStatus.NeedsAction,
    }).finally(() => this._fetchData());
  }

  private _saveEdit(ev): void {
    // If name is not empty, update the item otherwise remove it
    if (ev.target.value) {
      const item = this._items[ev.target.itemId];
      updateItem(this.hass!, this._entityId!, {
        ...item,
        summary: ev.target.value,
      }).finally(() => this._fetchData());
    } else {
      deleteItems(this.hass!, this._entityId!, [ev.target.itemId]).finally(() =>
        this._fetchData()
      );
    }

    ev.target.blur();
  }

  private _clearCompletedItems(): void {
    if (this.hass) {
      const uids: Array<string> = [];
      this._checkedItems.forEach((item: TodoItem) => {
        uids.push(item.uid);
      });
      deleteItems(this.hass, this._entityId!, uids).finally(() =>
        this._fetchData()
      );
    }
  }

  private get _newItem(): HaTextField {
    return this.shadowRoot!.querySelector(".addBox") as HaTextField;
  }

  private _addItem(ev): void {
    const newItem = this._newItem;
    if (newItem.value!.length > 0) {
      createItem(this.hass!, this._entityId!, newItem.value!).finally(() =>
        this._fetchData()
      );
    }

    newItem.value = "";
    if (ev) {
      newItem.focus();
    }
  }

  private _addKeyPress(ev): void {
    if (ev.key === "Enter") {
      this._addItem(null);
    }
  }

  private async _toggleReorder() {
    this._reordering = !this._reordering;
    await this.updateComplete;
    if (this._reordering) {
      this._createSortable();
    } else {
      this._sortable?.destroy();
      this._sortable = undefined;
    }
  }

  private async _createSortable() {
    const Sortable = await loadSortable();
    const sortableEl = this._sortableEl;
    this._sortable = new Sortable(sortableEl!, {
      animation: 150,
      fallbackClass: "sortable-fallback",
      dataIdAttr: "item-id",
      handle: "ha-svg-icon",
      onEnd: async (evt) => {
        if (evt.newIndex === undefined || evt.oldIndex === undefined) {
          return;
        }
        // Since this is `onEnd` event, it's possible that
        // an item wa dragged away and was put back to its original position.
        if (evt.oldIndex !== evt.newIndex) {
          const item = this._uncheckedItems![evt.oldIndex];
          let previous = "";
          if (evt.newIndex > 0) {
            if (evt.newIndex < evt.oldIndex) {
              const previousItem = this._uncheckedItems![evt.newIndex - 1];
              previous = previousItem.uid!;
            } else {
              const previousItem = this._uncheckedItems![evt.newIndex];
              previous = previousItem.uid!;
            }
          }
          moveItem(this.hass!, this._entityId!, item.uid!, previous).catch(() =>
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
        padding: 16px;
        height: 100%;
        box-sizing: border-box;
      }

      .has-header {
        padding-top: 0;
      }

      .editRow,
      .addRow,
      .checked {
        display: flex;
        flex-direction: row;
        align-items: center;
      }

      .item {
        margin-top: 8px;
      }

      .addButton {
        padding-right: 16px;
        padding-inline-end: 16px;
        cursor: pointer;
        direction: var(--direction);
      }

      .reorderButton {
        padding-left: 16px;
        padding-inline-start: 16px;
        cursor: pointer;
        direction: var(--direction);
      }

      ha-checkbox {
        margin-left: -12px;
        margin-inline-start: -12px;
        direction: var(--direction);
      }

      ha-textfield {
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

      .divider {
        height: 1px;
        background-color: var(--divider-color);
        margin: 10px 0;
      }

      .clearall {
        cursor: pointer;
      }

      .todoList {
        display: block;
        padding: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shopping-list-card": HuiShoppingListCard;
  }
}
