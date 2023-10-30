import {
  mdiDelete,
  mdiDrag,
  mdiNotificationClearAll,
  mdiPlus,
  mdiSort,
} from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  PropertyValueMap,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import type { SortableEvent } from "sortablejs";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-card";
import "../../../components/ha-checkbox";
import "../../../components/ha-list-item";
import "../../../components/ha-select";
import "../../../components/ha-svg-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import {
  TodoItem,
  TodoItemStatus,
  TodoListEntityFeature,
  createItem,
  deleteItem,
  fetchItems,
  moveItem,
  updateItem,
} from "../../../data/todo";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { SortableInstance } from "../../../resources/sortable";
import { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { TodoListCardConfig } from "./types";
import { isUnavailableState } from "../../../data/entity";

@customElement("hui-todo-list-card")
export class HuiTodoListCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-todo-list-editor");
    return document.createElement("hui-todo-list-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): TodoListCardConfig {
    const includeDomains = ["todo"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "todo-list", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TodoListCardConfig;

  @state() private _entityId?: string;

  @state() private _items?: TodoItem[];

  @state() private _reordering = false;

  private _sortable?: SortableInstance;

  @query("#unchecked") private _uncheckedContainer?: HTMLElement;

  public getCardSize(): number {
    return (this._config ? (this._config.title ? 2 : 0) : 0) + 3;
  }

  public setConfig(config: TodoListCardConfig): void {
    this.checkConfig(config);

    this._config = config;
    this._entityId = config.entity;
  }

  protected checkConfig(config: TodoListCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "todo") {
      throw new Error("Specify an entity from within the todo domain");
    }
  }

  protected getEntityId(): string | undefined {
    // not implemented, todo list should always have an entity id set;
    return undefined;
  }

  private _getCheckedItems = memoizeOne((items?: TodoItem[]): TodoItem[] =>
    items
      ? items.filter((item) => item.status === TodoItemStatus.Completed)
      : []
  );

  private _getUncheckedItems = memoizeOne((items?: TodoItem[]): TodoItem[] =>
    items
      ? items.filter((item) => item.status === TodoItemStatus.NeedsAction)
      : []
  );

  public willUpdate(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (!this.hasUpdated) {
      if (!this._entityId) {
        this._entityId = this.getEntityId();
      }
      this._fetchData();
    } else if (changedProperties.has("_entityId") || !this._items) {
      this._items = undefined;
      this._fetchData();
    }
  }

  public hassSubscribe(): Promise<UnsubscribeFunc>[] {
    return [
      this.hass!.connection.subscribeEvents(() => {
        if (
          this._entityId &&
          this.hass!.entities[this._entityId]?.platform === "shopping_list"
        ) {
          this._fetchData();
        }
      }, "shopping_list_updated"),
    ];
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | TodoListCardConfig
      | undefined;

    if (
      (changedProps.has("hass") && oldHass?.themes !== this.hass.themes) ||
      (changedProps.has("_config") && oldConfig?.theme !== this._config.theme)
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }

    if (
      this._entityId &&
      oldHass &&
      oldHass.states[this._entityId] !== this.hass.states[this._entityId] &&
      this.hass.entities[this._entityId]?.platform !== "shopping_list"
    ) {
      this._fetchData();
    }
  }

  protected render() {
    if (!this._config || !this.hass || !this._entityId) {
      return nothing;
    }

    const stateObj = this.hass.states[this._entityId];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._entityId)}
        </hui-warning>
      `;
    }

    const unavailable = isUnavailableState(stateObj.state);

    const checkedItems = this._getCheckedItems(this._items);
    const uncheckedItems = this._getUncheckedItems(this._items);

    return html`
      <ha-card
        .header=${this._config.title}
        class=${classMap({
          "has-header": "title" in this._config,
        })}
      >
        <div class="addRow">
          ${this.todoListSupportsFeature(TodoListEntityFeature.CREATE_TODO_ITEM)
            ? html`
                <ha-icon-button
                  class="addButton"
                  .path=${mdiPlus}
                  .title=${this.hass!.localize(
                    "ui.panel.lovelace.cards.todo-list.add_item"
                  )}
                  .disabled=${unavailable}
                  @click=${this._addItem}
                >
                </ha-icon-button>
                <ha-textfield
                  class="addBox"
                  .placeholder=${this.hass!.localize(
                    "ui.panel.lovelace.cards.todo-list.add_item"
                  )}
                  @keydown=${this._addKeyPress}
                  .disabled=${unavailable}
                ></ha-textfield>
              `
            : nothing}
          ${this.todoListSupportsFeature(TodoListEntityFeature.MOVE_TODO_ITEM)
            ? html`
                <ha-icon-button
                  class="reorderButton"
                  .path=${mdiSort}
                  .title=${this.hass!.localize(
                    "ui.panel.lovelace.cards.todo-list.reorder_items"
                  )}
                  @click=${this._toggleReorder}
                  .disabled=${unavailable}
                >
                </ha-icon-button>
              `
            : nothing}
        </div>
        <div id="unchecked">
          ${this._renderItems(uncheckedItems, unavailable)}
        </div>
        ${checkedItems.length
          ? html`
              <div class="divider"></div>
              <div class="checked">
                <span>
                  ${this.hass!.localize(
                    "ui.panel.lovelace.cards.todo-list.checked_items"
                  )}
                </span>
                ${this.todoListSupportsFeature(
                  TodoListEntityFeature.DELETE_TODO_ITEM
                )
                  ? html`<ha-svg-icon
                      class="clearall"
                      tabindex="0"
                      .path=${mdiNotificationClearAll}
                      .title=${this.hass!.localize(
                        "ui.panel.lovelace.cards.todo-list.clear_items"
                      )}
                      @click=${this._clearCompletedItems}
                      .disabled=${unavailable}
                    >
                    </ha-svg-icon>`
                  : nothing}
              </div>
              ${repeat(
                checkedItems,
                (item) => item.uid,
                (item) => html`
                  <div class="editRow">
                    ${this.todoListSupportsFeature(
                      TodoListEntityFeature.UPDATE_TODO_ITEM
                    )
                      ? html`<ha-checkbox
                          tabindex="0"
                          .checked=${item.status === TodoItemStatus.Completed}
                          .itemId=${item.uid}
                          @change=${this._completeItem}
                          .disabled=${unavailable}
                        ></ha-checkbox>`
                      : nothing}
                    <ha-textfield
                      class="item"
                      .disabled=${unavailable ||
                      !this.todoListSupportsFeature(
                        TodoListEntityFeature.UPDATE_TODO_ITEM
                      )}
                      .value=${item.summary}
                      .itemId=${item.uid}
                      @change=${this._saveEdit}
                    ></ha-textfield>
                    ${this.todoListSupportsFeature(
                      TodoListEntityFeature.DELETE_TODO_ITEM
                    ) &&
                    !this.todoListSupportsFeature(
                      TodoListEntityFeature.UPDATE_TODO_ITEM
                    )
                      ? html`<ha-icon-button
                          .title=${this.hass!.localize(
                            "ui.panel.lovelace.cards.todo-list.delete_item"
                          )}
                          class="deleteItemButton"
                          .path=${mdiDelete}
                          .itemId=${item.uid}
                          @click=${this._deleteItem}
                        >
                        </ha-icon-button>`
                      : nothing}
                  </div>
                `
              )}
            `
          : ""}
      </ha-card>
    `;
  }

  private _renderItems(items: TodoItem[], unavailable = false) {
    return html`
      ${repeat(
        items,
        (item) => item.uid,
        (item) => html`
          <div class="editRow" item-id=${item.uid}>
            ${this.todoListSupportsFeature(
              TodoListEntityFeature.UPDATE_TODO_ITEM
            )
              ? html`<ha-checkbox
                  tabindex="0"
                  .checked=${item.status === TodoItemStatus.Completed}
                  .itemId=${item.uid}
                  .disabled=${unavailable}
                  @change=${this._completeItem}
                ></ha-checkbox>`
              : nothing}
            <ha-textfield
              class="item"
              .disabled=${unavailable ||
              !this.todoListSupportsFeature(
                TodoListEntityFeature.UPDATE_TODO_ITEM
              )}
              .value=${item.summary}
              .itemId=${item.uid}
              @change=${this._saveEdit}
            ></ha-textfield>
            ${this._reordering
              ? html`
                  <ha-svg-icon
                    .title=${this.hass!.localize(
                      "ui.panel.lovelace.cards.todo-list.drag_and_drop"
                    )}
                    class="reorderButton"
                    .path=${mdiDrag}
                  >
                  </ha-svg-icon>
                `
              : this.todoListSupportsFeature(
                  TodoListEntityFeature.DELETE_TODO_ITEM
                ) &&
                !this.todoListSupportsFeature(
                  TodoListEntityFeature.UPDATE_TODO_ITEM
                )
              ? html`<ha-icon-button
                  .title=${this.hass!.localize(
                    "ui.panel.lovelace.cards.todo-list.delete_item"
                  )}
                  class="deleteItemButton"
                  .path=${mdiDelete}
                  .itemId=${item.uid}
                  @click=${this._deleteItem}
                >
                </ha-icon-button>`
              : nothing}
          </div>
        `
      )}
    `;
  }

  private todoListSupportsFeature(feature: number): boolean {
    const entityStateObj = this.hass!.states[this._entityId!];
    return entityStateObj && supportsFeature(entityStateObj, feature);
  }

  private async _fetchData(): Promise<void> {
    if (!this.hass || !this._entityId) {
      return;
    }
    if (!(this._entityId in this.hass.states)) {
      return;
    }
    this._items = await fetchItems(this.hass!, this._entityId!);
  }

  private _getItem(itemId: string) {
    return this._items?.find((item) => item.uid === itemId);
  }

  private _completeItem(ev): void {
    const item = this._getItem(ev.target.itemId);
    if (!item) {
      return;
    }
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
      const item = this._getItem(ev.target.itemId);
      if (!item) {
        return;
      }
      updateItem(this.hass!, this._entityId!, {
        ...item,
        summary: ev.target.value,
      }).finally(() => this._fetchData());
    } else if (
      this.todoListSupportsFeature(TodoListEntityFeature.DELETE_TODO_ITEM)
    ) {
      deleteItem(this.hass!, this._entityId!, ev.target.itemId).finally(() =>
        this._fetchData()
      );
    }

    ev.target.blur();
  }

  private async _clearCompletedItems(): Promise<void> {
    if (!this.hass) {
      return;
    }
    const deleteActions: Array<Promise<any>> = [];
    this._getCheckedItems(this._items).forEach((item: TodoItem) => {
      deleteActions.push(deleteItem(this.hass!, this._entityId!, item.uid));
    });
    await Promise.all(deleteActions).finally(() => this._fetchData());
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

  private _deleteItem(ev): void {
    const item = this._getItem(ev.target.itemId);
    if (!item) {
      return;
    }
    deleteItem(this.hass!, this._entityId!, item.uid).finally(() =>
      this._fetchData()
    );
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
    const Sortable = (await import("../../../resources/sortable")).default;
    this._sortable = new Sortable(this._uncheckedContainer!, {
      animation: 150,
      fallbackClass: "sortable-fallback",
      dataIdAttr: "item-id",
      handle: "ha-svg-icon",
      onChoose: (evt: SortableEvent) => {
        (evt.item as any).placeholder =
          document.createComment("sort-placeholder");
        evt.item.after((evt.item as any).placeholder);
      },
      onEnd: (evt: SortableEvent) => {
        // put back in original location
        if ((evt.item as any).placeholder) {
          (evt.item as any).placeholder.replaceWith(evt.item);
          delete (evt.item as any).placeholder;
        }
        if (evt.newIndex === undefined || evt.oldIndex === undefined) {
          return;
        }
        // Since this is `onEnd` event, it's possible that
        // an item was dragged away and was put back to its original position.
        if (evt.oldIndex !== evt.newIndex) {
          this._moveItem(evt.oldIndex, evt.newIndex);
        }
      },
    });
  }

  private async _moveItem(oldIndex: number, newIndex: number) {
    const uncheckedItems = this._getUncheckedItems(this._items);
    const item = uncheckedItems[oldIndex];
    let prevItem: TodoItem | undefined;
    if (newIndex > 0) {
      if (newIndex < oldIndex) {
        prevItem = uncheckedItems[newIndex - 1];
      } else {
        prevItem = uncheckedItems[newIndex];
      }
    }

    // Optimistic change
    const itemIndex = this._items!.findIndex((itm) => itm.uid === item.uid);
    this._items!.splice(itemIndex, 1);
    if (newIndex === 0) {
      this._items!.unshift(item);
    } else {
      const prevIndex = this._items!.findIndex(
        (itm) => itm.uid === prevItem!.uid
      );
      this._items!.splice(prevIndex + 1, 0, item);
    }
    this._items = [...this._items!];

    await moveItem(
      this.hass!,
      this._entityId!,
      item.uid,
      prevItem?.uid
    ).finally(() => this._fetchData());
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
        margin-left: -12px;
        margin-inline-start: -12px;
        direction: var(--direction);
      }

      .deleteItemButton {
        margin-right: -12px;
        margin-inline-end: -12px;
        direction: var(--direction);
      }

      .reorderButton {
        margin-right: -12px;
        margin-inline-end: -12px;
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
    "hui-todo-list-card": HuiTodoListCard;
  }
}
