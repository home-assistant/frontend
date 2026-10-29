import {
  mdiClock,
  mdiDelete,
  mdiDeleteSweep,
  mdiDotsVertical,
  mdiDragHorizontalVariant,
  mdiPlus,
  mdiSort,
} from "@mdi/js";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  isSameDay,
} from "date-fns";
import type {
  Connection,
  HassConfig,
  HassEntities,
  HassEntity,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { calcDate } from "../../../common/datetime/calc_date";
import { firstWeekdayIndex } from "../../../common/datetime/first_weekday";
import { consume } from "../../../common/decorators/consume";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import "../../../components/ha-card";
import "../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../components/ha-checkbox";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown-element";
import "../../../components/ha-relative-time";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import "../../../components/item/ha-list-item-option";
import type { HaListItemOption } from "../../../components/item/ha-list-item-option";
import "../../../components/list/ha-list-selectable";
import type { HaListSelectable } from "../../../components/list/ha-list-selectable";
import "../../../components/input/ha-input";
import type { HaInput } from "../../../components/input/ha-input";
import {
  apiContext,
  configContext,
  connectionContext,
  entitiesContext,
  formattersContext,
  internationalizationContext,
  statesContext,
  uiContext,
} from "../../../data/context";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity/entity";
import type { TodoItem } from "../../../data/todo";
import {
  TodoItemStatus,
  TodoListEntityFeature,
  TodoSortMode,
  createItem,
  deleteItems,
  moveItem,
  subscribeItems,
  updateItem,
} from "../../../data/todo";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { Themes } from "../../../data/ws-themes";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantUI,
} from "../../../types";
import { showTodoItemEditDialog } from "../../todo/show-dialog-todo-item-editor";
import { findEntities } from "../common/find-entities";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { TodoListCardConfig } from "./types";

export const ITEM_TAP_ACTION_EDIT = "edit";
export const ITEM_TAP_ACTION_TOGGLE = "toggle";

interface TodoDueDatePeriod {
  calendar?: {
    period: string;
    offset?: number;
  };
}

@customElement("hui-todo-list-card")
export class HuiTodoListCard extends LitElement implements LovelaceCard {
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

  @state() private _config?: TodoListCardConfig;

  @state() private _entityId?: string;

  @state()
  @consumeEntityState({ entityIdPath: ["_entityId"] })
  private _stateObj?: HassEntity;

  @consume({ context: statesContext, subscribe: true })
  protected _states!: HassEntities;

  @consume({ context: entitiesContext, subscribe: true })
  protected _entities!: HomeAssistant["entities"];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  protected _i18n!: HomeAssistantInternationalization;

  @consume({ context: formattersContext, subscribe: true })
  protected _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, Themes>({
    transformer: ({ themes }) => themes,
  })
  private _themes!: Themes;

  @consume({ context: connectionContext, subscribe: true })
  @transform<HomeAssistantConnection, Connection>({
    transformer: ({ connection }) => connection,
  })
  private _connection!: Connection;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _items?: TodoItem[];

  @state() private _reordering = false;

  @query("ha-input", true) private _input!: HaInput;

  @query("ha-list-selectable") private _list?: HaListSelectable;

  private _unsubItems?: Promise<UnsubscribeFunc>;

  private _refreshTimer?: number;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._subscribeItems();
    }
    this._setRefreshTimer();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubItems?.then((unsub) => unsub());
    this._unsubItems = undefined;
    this._clearRefreshTimer();
  }

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

  private _sortItems(items: TodoItem[], sort?: string) {
    if (sort === TodoSortMode.ALPHA_ASC || sort === TodoSortMode.ALPHA_DESC) {
      const sortOrder = sort === TodoSortMode.ALPHA_ASC ? 1 : -1;
      return items.sort(
        (a, b) =>
          sortOrder *
          caseInsensitiveStringCompare(
            a.summary,
            b.summary,
            this._i18n?.locale.language
          )
      );
    }
    if (
      sort === TodoSortMode.DUEDATE_ASC ||
      sort === TodoSortMode.DUEDATE_DESC
    ) {
      const sortOrder = sort === TodoSortMode.DUEDATE_ASC ? 1 : -1;
      return items.sort((a, b) => {
        const aDue = this._getDueDate(a) ?? Infinity;
        const bDue = this._getDueDate(b) ?? Infinity;
        if (aDue === bDue) {
          return 0;
        }
        return aDue < bDue ? -sortOrder : sortOrder;
      });
    }
    return items;
  }

  private _getUncheckedAndItemsWithoutStatus = memoizeOne(
    (
      items?: TodoItem[],
      sort?: string | undefined,
      due_date_period?: TodoDueDatePeriod,
      _memoTime?: number
    ): TodoItem[] =>
      items
        ? this._sortItems(
            this._filterItems(
              items,
              [null, TodoItemStatus.NeedsAction],
              due_date_period
            ),
            sort
          )
        : []
  );

  private _getCheckedItems = memoizeOne(
    (
      items?: TodoItem[],
      sort?: string | undefined,
      due_date_period?: TodoDueDatePeriod,
      _memoTime?: number
    ): TodoItem[] =>
      items
        ? this._sortItems(
            this._filterItems(
              items,
              [TodoItemStatus.Completed],
              due_date_period
            ),
            sort
          )
        : []
  );

  private _getUncheckedItems = memoizeOne(
    (
      items?: TodoItem[],
      sort?: string | undefined,
      due_date_period?: TodoDueDatePeriod,
      _memoTime?: number
    ): TodoItem[] =>
      items
        ? this._sortItems(
            this._filterItems(
              items,
              [TodoItemStatus.NeedsAction],
              due_date_period
            ),
            sort
          )
        : []
  );

  private _getItemsWithoutStatus = memoizeOne(
    (
      items?: TodoItem[],
      sort?: string | undefined,
      due_date_period?: TodoDueDatePeriod,
      _memoTime?: number
    ): TodoItem[] =>
      items
        ? this._sortItems(
            this._filterItems(items, [null], due_date_period),
            sort
          )
        : []
  );

  private _filterItems(
    items: TodoItem[],
    status: (TodoItemStatus | null)[],
    period?: TodoDueDatePeriod
  ): TodoItem[] {
    const endDate =
      period && period.calendar && period.calendar.period
        ? this._addPeriod(new Date(), period.calendar)
        : undefined;

    return items.filter((item) => {
      if (!status.includes(item.status || null)) {
        return false;
      }
      if (!endDate) {
        return true;
      }
      const dueDate = this._getDueDate(item);
      return dueDate && dueDate <= endDate;
    });
  }

  private _addPeriod(
    date: Date,
    calendar: { period: string; offset?: number }
  ): Date | undefined {
    const locale = this._i18n.locale;
    const config = this._hassConfig;
    const offset = calendar.offset || 0;
    switch (calendar.period) {
      case "day":
        return addDays(calcDate(date, endOfDay, locale, config), offset);
      case "week": {
        const weekStartsOn = firstWeekdayIndex(locale);
        return addWeeks(
          calcDate(date, endOfWeek, locale, config, {
            weekStartsOn,
          }),
          offset
        );
      }
      case "month":
        return addMonths(calcDate(date, endOfMonth, locale, config), offset);
      case "year":
        return addYears(calcDate(date, endOfYear, locale, config), offset);
      default:
        return undefined;
    }
  }

  private _setRefreshTimer() {
    this._clearRefreshTimer();
    if (!this._i18n || !this._hassConfig) {
      return;
    }
    // Due labels such as "Today" and the overdue styling depend on the time,
    // so refresh at midnight or at the next item deadline, whichever is first.
    const nowDate = new Date();
    const now = nowDate.getTime();
    let refreshAt = calcDate(
      nowDate,
      endOfDay,
      this._i18n.locale,
      this._hassConfig
    ).getTime();
    // "Today" follows the browser day, which can end before the day in the
    // configured time zone does.
    const browserMidnight = endOfDay(nowDate).getTime();
    if (browserMidnight < refreshAt) {
      refreshAt = browserMidnight;
    }
    for (const item of this._items ?? []) {
      const due = this._getDueDate(item)?.getTime();
      if (due !== undefined && due > now && due < refreshAt) {
        refreshAt = due;
      }
    }
    this._refreshTimer = window.setTimeout(
      () => {
        this._refreshTimer = undefined;
        this.requestUpdate();
      },
      refreshAt - now + 1000
    );
  }

  private _clearRefreshTimer() {
    if (this._refreshTimer === undefined) {
      return;
    }
    window.clearTimeout(this._refreshTimer);
    this._refreshTimer = undefined;
  }

  public willUpdate(changedProperties: PropertyValues): void {
    if (!this.hasUpdated) {
      if (!this._entityId) {
        this._entityId = this.getEntityId();
      }
      this._subscribeItems();
    } else if (changedProperties.has("_entityId") || !this._items) {
      this._items = undefined;
      this._subscribeItems();
    }

    if (!this._refreshTimer || changedProperties.has("_items")) {
      this._setRefreshTimer();
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this._themes) {
      return;
    }

    const oldConfig = changedProps.get("_config") as
      TodoListCardConfig | undefined;

    if (
      changedProps.has("_themes") ||
      (changedProps.has("_config") && oldConfig?.theme !== this._config.theme)
    ) {
      applyThemesOnElement(this, this._themes, this._config.theme);
    }
  }

  protected render() {
    if (!this._config || !this._i18n || !this._entityId) {
      return nothing;
    }

    const stateObj = this._stateObj;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this._i18n.localize, this._hassConfig)}
        </hui-warning>
      `;
    }

    const unavailable =
      stateObj.state === UNAVAILABLE || stateObj.state === UNKNOWN;

    // Discard memoization when we rollover to a new day, so filters can be recalculated
    const memoTime = this._config.due_date_period
      ? calcDate(
          new Date(),
          endOfDay,
          this._i18n.locale,
          this._hassConfig
        ).getTime()
      : 0;

    const checkedItems = this._getCheckedItems(
      this._items,
      this._config.display_order,
      this._config.due_date_period,
      memoTime
    );
    const uncheckedItems = this._getUncheckedItems(
      this._items,
      this._config.display_order,
      this._config.due_date_period,
      memoTime
    );

    const itemsWithoutStatus = this._getItemsWithoutStatus(
      this._items,
      this._config.display_order,
      this._config.due_date_period,
      memoTime
    );

    const reorderableItems = this._reordering
      ? this._getUncheckedAndItemsWithoutStatus(
          this._items,
          this._config.display_order,
          this._config.due_date_period,
          memoTime
        )
      : undefined;

    return html`
      <ha-card
        .header=${this._config.title}
        class=${classMap({
          "has-header": "title" in this._config,
        })}
      >
        ${
          !this._config.hide_create &&
          this._todoListSupportsFeature(TodoListEntityFeature.CREATE_TODO_ITEM)
            ? html`
                <div class="addRow">
                  <ha-input
                    .placeholder=${this._i18n.localize(
                      "ui.panel.lovelace.cards.todo-list.add_item"
                    )}
                    enterkeyhint="done"
                    @keydown=${this._addKeyPress}
                    .disabled=${unavailable}
                  >
                    <ha-icon-button
                      slot="end"
                      class="addButton"
                      .path=${mdiPlus}
                      .title=${this._i18n.localize(
                        "ui.panel.lovelace.cards.todo-list.add_item"
                      )}
                      .disabled=${unavailable}
                      @click=${this._addItem}
                    >
                    </ha-icon-button>
                  </ha-input>
                </div>
              `
            : nothing
        }
        <ha-sortable
          handle-selector="ha-svg-icon"
          draggable-selector=".draggable"
          .disabled=${!this._reordering}
          @item-moved=${this._itemMoved}
        >
          <ha-list-selectable wrap-focus multi controlled>
            ${
              !this._items
                ? nothing
                : !uncheckedItems.length && !itemsWithoutStatus.length
                  ? html`<p class="empty">
                      ${this._i18n.localize(
                        "ui.panel.lovelace.cards.todo-list.no_unchecked_items"
                      )}
                    </p>`
                  : this._reordering
                    ? html`<div class="header" role="separator">
                          <h2>
                            ${this._i18n.localize(
                              "ui.panel.lovelace.cards.todo-list.reorder_items"
                            )}
                          </h2>
                          ${this._renderMenu(this._config, unavailable)}
                        </div>
                        ${this._renderItems(reorderableItems ?? [], unavailable)}`
                    : nothing
            }
            ${
              !this._reordering && uncheckedItems.length
                ? html`
                    ${
                      !this._config.hide_section_headers
                        ? html`<div class="header">
                            <h2>
                              ${this._i18n.localize(
                                "ui.panel.lovelace.cards.todo-list.unchecked_items"
                              )}
                            </h2>
                            ${this._renderMenu(this._config, unavailable)}
                          </div>`
                        : nothing
                    }
                    ${this._renderItems(uncheckedItems, unavailable)}
                  `
                : nothing
            }
            ${
              !this._reordering && itemsWithoutStatus.length
                ? html`
                    <div>
                      ${
                        uncheckedItems.length
                          ? html`<div class="divider" role="separator"></div>`
                          : nothing
                      }
                      <div class="header" role="separator">
                        <h2>
                          ${this._i18n.localize(
                            "ui.panel.lovelace.cards.todo-list.no_status_items"
                          )}
                        </h2>
                        ${
                          !uncheckedItems.length
                            ? this._renderMenu(this._config, unavailable)
                            : nothing
                        }
                      </div>
                    </div>
                    ${this._renderItems(itemsWithoutStatus, unavailable)}
                  `
                : nothing
            }
            ${
              !this._config.hide_completed && checkedItems.length
                ? html`
                    <div>
                      <div class="divider" role="separator"></div>
                      ${
                        !this._config.hide_section_headers
                          ? html`<div class="header">
                              <h2>
                                ${this._i18n.localize(
                                  "ui.panel.lovelace.cards.todo-list.checked_items"
                                )}
                              </h2>
                              ${
                                this._todoListSupportsFeature(
                                  TodoListEntityFeature.DELETE_TODO_ITEM
                                )
                                  ? html`<ha-dropdown
                                      @wa-select=${this._handleCompletedMenuSelect}
                                      placement="bottom-end"
                                    >
                                      <ha-icon-button
                                        slot="trigger"
                                        .path=${mdiDotsVertical}
                                      ></ha-icon-button>
                                      <ha-dropdown-item
                                        value="clear"
                                        variant="danger"
                                      >
                                        ${this._i18n.localize(
                                          "ui.panel.lovelace.cards.todo-list.clear_items"
                                        )}
                                        <ha-svg-icon
                                          slot="icon"
                                          .path=${mdiDeleteSweep}
                                        >
                                        </ha-svg-icon>
                                      </ha-dropdown-item>
                                    </ha-dropdown>`
                                  : nothing
                              }
                            </div>`
                          : nothing
                      }
                    </div>
                    ${this._renderItems(checkedItems, unavailable)}
                  `
                : nothing
            }
          </ha-list-selectable>
        </ha-sortable>
      </ha-card>
    `;
  }

  private _renderMenu(config: TodoListCardConfig, _unavailable: boolean) {
    return (!config.display_order ||
      config.display_order === TodoSortMode.NONE) &&
      this._todoListSupportsFeature(TodoListEntityFeature.MOVE_TODO_ITEM)
      ? html`<ha-dropdown
          @wa-select=${this._handlePrimaryMenuSelect}
          placement="bottom-end"
        >
          <ha-icon-button
            slot="trigger"
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-dropdown-item value="reorder">
            ${this._i18n.localize(
              this._reordering
                ? "ui.panel.lovelace.cards.todo-list.exit_reorder_items"
                : "ui.panel.lovelace.cards.todo-list.reorder_items"
            )}
            <ha-svg-icon slot="icon" .path=${mdiSort}> </ha-svg-icon>
          </ha-dropdown-item>
        </ha-dropdown>`
      : nothing;
  }

  private _getDueDate(item: TodoItem): Date | undefined {
    return item.due
      ? item.due.includes("T")
        ? new Date(item.due)
        : endOfDay(new Date(`${item.due}T00:00:00`))
      : undefined;
  }

  private _renderItems(items: TodoItem[], unavailable = false) {
    return html`
      ${repeat(
        items,
        (item) => item.uid,
        (item) => {
          const showDelete =
            this._todoListSupportsFeature(
              TodoListEntityFeature.DELETE_TODO_ITEM
            ) &&
            !this._todoListSupportsFeature(
              TodoListEntityFeature.UPDATE_TODO_ITEM
            );
          const showReorder =
            item.status !== TodoItemStatus.Completed && this._reordering;
          const due = this._getDueDate(item);
          const today =
            due && !item.due!.includes("T") && isSameDay(new Date(), due);
          return html`
            <ha-list-item-option
              appearance="line"
              .value=${item.uid}
              class="editRow ${classMap({
                draggable: item.status !== TodoItemStatus.Completed,
                completed: item.status === TodoItemStatus.Completed,
                multiline: Boolean(item.description || item.due),
              })}"
              .selected=${item.status === TodoItemStatus.Completed}
              .disabled=${unavailable}
              @keydown=${this._handleKeydown}
              @click=${this._itemTap}
            >
              <ha-checkbox
                slot="start"
                tabindex="-1"
                .value=${item.uid}
                .checked=${item.status === TodoItemStatus.Completed}
                .indeterminate=${!item.status}
                .disabled=${
                  unavailable ||
                  !this._todoListSupportsFeature(
                    TodoListEntityFeature.UPDATE_TODO_ITEM
                  )
                }
                aria-label=${item.summary}
                @click=${stopPropagation}
                @change=${this._completeCheckboxItem}
              ></ha-checkbox>
              <div slot="headline" class="column">
                <span class="summary">${item.summary}</span>
                ${
                  item.description
                    ? html`<ha-markdown-element
                        class="description"
                        .content=${item.description}
                      ></ha-markdown-element>`
                    : nothing
                }
                ${
                  due
                    ? html`<div
                        class="due ${due < new Date() ? "overdue" : ""}"
                      >
                        <ha-svg-icon .path=${mdiClock}></ha-svg-icon>${
                          today
                            ? this._i18n.localize(
                                "ui.panel.lovelace.cards.todo-list.today"
                              )
                            : html`<ha-relative-time
                                capitalize
                                .datetime=${due}
                              ></ha-relative-time>`
                        }
                      </div>`
                    : nothing
                }
              </div>
              ${
                showReorder
                  ? html`
                      <ha-svg-icon
                        .title=${this._i18n.localize(
                          "ui.panel.lovelace.cards.todo-list.drag_and_drop"
                        )}
                        class="reorderButton handle"
                        .path=${mdiDragHorizontalVariant}
                        slot="meta"
                      >
                      </ha-svg-icon>
                    `
                  : showDelete
                    ? html`<ha-icon-button
                        .title=${this._i18n.localize(
                          "ui.panel.lovelace.cards.todo-list.delete_item"
                        )}
                        class="deleteItemButton"
                        .path=${mdiDelete}
                        .itemId=${item.uid}
                        slot="meta"
                        @click=${this._deleteItem}
                      >
                      </ha-icon-button>`
                    : nothing
              }
            </ha-list-item-option>
          `;
        }
      )}
    `;
  }

  private _todoListSupportsFeature(feature: number): boolean {
    const entityStateObj = this._stateObj;
    return !!entityStateObj && supportsFeature(entityStateObj, feature);
  }

  private async _subscribeItems(): Promise<void> {
    if (this._unsubItems) {
      this._unsubItems.then((unsub) => unsub());
      this._unsubItems = undefined;
    }
    if (!this._connection || !this._entityId) {
      return;
    }
    if (!(this._entityId in this._states)) {
      return;
    }
    this._unsubItems = subscribeItems(
      this._connection,
      this._entityId,
      (update) => {
        this._items = update.items;
      }
    );
  }

  private _getItem(itemId: string) {
    return this._items?.find((item) => item.uid === itemId);
  }

  private _completeCheckboxItem(
    ev: Event & HASSDomCurrentTargetEvent<HaCheckbox>
  ): void {
    if (ev.currentTarget.value) {
      this._completeItem(ev.currentTarget.value);
    }
  }

  private _handleKeydown(
    ev: KeyboardEvent & HASSDomCurrentTargetEvent<HaListItemOption>
  ): void {
    const isCheckbox = ev
      .composedPath()
      .some(
        (el) => el instanceof HTMLElement && el.localName === "ha-checkbox"
      );
    if (ev.key === " ") {
      if (isCheckbox) {
        ev.stopPropagation();
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      this._completeItem(ev.currentTarget.value!, true);
      return;
    }
    if (ev.key === "Enter") {
      ev.preventDefault();
      ev.stopPropagation();
      this._itemTap(ev);
    }
  }

  private _itemTap(
    ev: Event & HASSDomCurrentTargetEvent<HaListItemOption>
  ): void {
    ev.stopPropagation();
    if (
      !this._config!.item_tap_action ||
      this._config!.item_tap_action === ITEM_TAP_ACTION_EDIT
    ) {
      this._openItem(ev);
    } else if (this._config!.item_tap_action === ITEM_TAP_ACTION_TOGGLE) {
      this._completeItem(ev.currentTarget.value!, ev.type === "keydown");
    }
  }

  private _openItem(
    ev: Event & HASSDomCurrentTargetEvent<HaListItemOption>
  ): void {
    if (
      ev
        .composedPath()
        .find(
          (el) =>
            el instanceof Element &&
            ["input", "a", "button"].includes(el.localName)
        )
    ) {
      return;
    }

    const item = this._getItem(ev.currentTarget.value!);
    showTodoItemEditDialog(this, {
      entity: this._entityId!,
      item,
    });
  }

  private async _completeItem(
    itemId: string,
    restoreFocus = false
  ): Promise<void> {
    let focusedIndex: number | undefined;
    const list = this._list;
    if (restoreFocus && list) {
      focusedIndex = list.getActiveItemIndex();
    }
    const item = this._getItem(itemId);
    if (!item) {
      return;
    }
    await updateItem(this._api.callService, this._entityId!, {
      uid: item.uid,
      summary: item.summary,
      status:
        item.status === TodoItemStatus.NeedsAction
          ? TodoItemStatus.Completed
          : TodoItemStatus.NeedsAction,
    });
    if (focusedIndex !== undefined && list) {
      await this.updateComplete;
      await list.updateComplete;
      list.focusItemAtIndex(focusedIndex);
    }
  }

  private _handleCompletedMenuSelect(ev: HaDropdownSelectEvent) {
    if (ev.detail?.item?.value === "clear") {
      this._clearCompletedItems();
    }
  }

  private _clearCompletedItems() {
    const checkedItems = this._getCheckedItems(this._items);
    const uids = checkedItems.map((item: TodoItem) => item.uid);
    showConfirmationDialog(this, {
      title: this._i18n.localize(
        "ui.panel.lovelace.cards.todo-list.delete_confirm_title"
      ),
      text: this._i18n.localize(
        "ui.panel.lovelace.cards.todo-list.delete_confirm_text",
        { number: uids.length }
      ),
      dismissText: this._i18n.localize("ui.common.cancel"),
      confirmText: this._i18n.localize("ui.common.delete"),
      destructive: true,
      confirm: () => {
        deleteItems(this._api.callService, this._entityId!, uids);
      },
    });
  }

  private get _newItem(): HaInput {
    return this._input;
  }

  private _addItem(ev) {
    const newItem = this._newItem;
    if (newItem.value!.length > 0) {
      if (this._config?.due_date_period) {
        const item = {
          summary: newItem.value!,
          status: TodoItemStatus.NeedsAction,
        };
        showTodoItemEditDialog(this, {
          entity: this._entityId!,
          item,
        });
      } else {
        createItem(this._api.callService, this._entityId!, {
          summary: newItem.value!,
        });
      }
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
    deleteItems(this._api.callService, this._entityId!, [item.uid]);
  }

  private _addKeyPress(ev): void {
    if (ev.key === "Enter") {
      this._addItem(null);
    }
  }

  private _handlePrimaryMenuSelect(ev: HaDropdownSelectEvent) {
    if (ev.detail?.item?.value === "reorder") {
      this._toggleReorder();
    }
  }

  private _toggleReorder() {
    this._reordering = !this._reordering;
  }

  private async _itemMoved(ev: CustomEvent) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    this._moveItem(oldIndex, newIndex);
  }

  private _findFirstItem(
    items: HTMLCollection,
    start: number,
    direction: "up" | "down"
  ) {
    let item: Element | undefined;
    let index = direction === "up" ? start - 1 : start;
    while (item?.localName !== "ha-list-item-option") {
      item = items[index];
      index = direction === "up" ? index - 1 : index + 1;
      if (!item) {
        break;
      }
    }
    return item;
  }

  private async _moveItem(oldIndex: number, newIndex: number) {
    await this.updateComplete;

    const list = this._list!;

    const items = list.children;

    const itemId = (items[oldIndex] as HaListItemOption).value!;

    const prevItemId = (
      this._findFirstItem(
        items,
        newIndex,
        newIndex < oldIndex ? "up" : "down"
      ) as HaListItemOption | undefined
    )?.value;

    // Optimistic change
    const itemIndex = this._items!.findIndex((itm) => itm.uid === itemId);
    const item = this._items!.splice(itemIndex, 1)[0];

    if (!prevItemId) {
      this._items!.unshift(item);
    } else {
      const prevIndex = this._items!.findIndex((itm) => itm.uid === prevItemId);
      this._items!.splice(prevIndex + 1, 0, item);
    }
    this._items = [...this._items!];

    await moveItem(this._api.callWS, this._entityId!, itemId, prevItemId);
  }

  static styles = css`
    ha-card {
      height: 100%;
      box-sizing: border-box;
      overflow-y: auto;
    }

    .has-header {
      padding-top: 0;
    }

    .addRow {
      padding: 16px;
      padding-bottom: 0;
      position: relative;
    }

    .addRow ha-icon-button {
      --ha-icon-button-size: 32px;
    }

    .addRow,
    .header {
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    .header {
      padding-left: var(--ha-space-4);
      padding-right: var(--ha-space-4);
      padding-inline-start: var(--ha-space-4);
      padding-inline-end: var(--ha-space-4);
      margin-top: var(--ha-space-2);
      justify-content: space-between;
      direction: var(--direction);
    }

    .header h2 {
      color: var(--primary-text-color);
      font-size: inherit;
      font-weight: var(--ha-font-weight-medium);
    }

    .empty {
      padding: var(--ha-space-4) var(--ha-space-8);
      display: inline-block;
    }

    .item {
      margin-top: var(--ha-space-2);
    }

    ha-list-item-option {
      --ha-row-item-min-height: 40px;
      height: auto;
      --ha-row-item-padding-inline: var(--ha-space-5);
      --ha-list-item-selected-background: transparent;
      color: var(--primary-text-color);
    }

    .row {
      display: flex;
      justify-content: space-between;
    }

    .multiline .column {
      display: flex;
      flex-direction: column;
      margin-top: var(--ha-space-2);
      margin-bottom: var(--ha-space-2);
      white-space: normal;
    }

    .completed .summary {
      text-decoration: line-through;
    }

    .description,
    .due {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }

    .description {
      white-space: initial;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    .description p {
      margin: 0;
    }

    .description a {
      color: var(--primary-color);
    }

    .due {
      display: flex;
      align-items: center;
    }

    .due ha-svg-icon {
      margin-right: 4px;
      margin-inline-end: 4px;
      margin-inline-start: initial;
      --mdc-icon-size: 14px;
    }

    .due.overdue {
      color: var(--warning-color);
    }

    .completed .due.overdue {
      color: var(--secondary-text-color);
    }

    .handle {
      cursor: move; /* fallback if grab cursor is unsupported */
      cursor: grab;
      height: 24px;
      padding: 0 4px;
    }

    .deleteItemButton {
      position: relative;
      left: 8px;
      inset-inline-start: 8px;
      inset-inline-end: initial;
    }

    ha-input {
      flex-grow: 1;
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

    .warning {
      color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-todo-list-card": HuiTodoListCard;
  }
}
