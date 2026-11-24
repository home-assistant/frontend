import type { List } from "@material/mwc-list/mwc-list";
import {
  mdiCheck,
  mdiCheckboxBlankOutline,
  mdiClock,
  mdiContentDuplicate,
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
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { calcDate } from "../../../common/datetime/calc_date";
import { firstWeekdayIndex } from "../../../common/datetime/first_weekday";
import { consume } from "../../../common/decorators/consume";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import "../../../components/ha-card";
import "../../../components/ha-check-list-item";
import type { HaCheckListItem } from "../../../components/ha-check-list-item";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-list";
import "../../../components/ha-markdown-element";
import "../../../components/ha-relative-time";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
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
import type { TodoItem, TodoSwipeAction } from "../../../data/todo";
import {
  TodoItemStatus,
  TodoListEntityFeature,
  TodoSortMode,
  createItem,
  deleteItems,
  findDuplicateTodoItems,
  getTodoSwipeAction,
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

const SWIPE_START_THRESHOLD = 10;
const SWIPE_MIN_TRIGGER_DISTANCE = 72;
const SWIPE_TRIGGER_RATIO = 0.3;

type TodoListItemElement = HaCheckListItem & { itemId: string };

interface TodoSwipeState {
  item: TodoListItemElement;
  pointerId: number;
  startX: number;
  startY: number;
  offset: number;
  horizontal: boolean;
}

interface TodoSwipeIndicator {
  top: number;
  height: number;
  /** Physical side that is revealed while the item slides away */
  side: "left" | "right";
  action: TodoSwipeAction;
  /** Whether releasing now triggers the action */
  armed: boolean;
}

const SWIPE_ACTION_ICONS: Record<TodoSwipeAction, string> = {
  complete: mdiCheck,
  uncomplete: mdiCheckboxBlankOutline,
  delete: mdiDelete,
};

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

  @query("ha-list") private _list?: List;

  @query("ha-card") private _card?: HTMLElement;

  private _unsubItems?: Promise<UnsubscribeFunc>;

  private _refreshTimer?: number;

  private _swipe?: TodoSwipeState;

  @state() private _swipeIndicator?: TodoSwipeIndicator;

  private _suppressNextTap = false;

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
          <ha-list wrapFocus multi>
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
          </ha-list>
        </ha-sortable>
        ${this._renderSwipeIndicator()}
      </ha-card>
    `;
  }

  private _renderMenu(config: TodoListCardConfig, unavailable: boolean) {
    const canReorder =
      (!config.display_order || config.display_order === TodoSortMode.NONE) &&
      this._todoListSupportsFeature(TodoListEntityFeature.MOVE_TODO_ITEM);
    const canDeleteDuplicates =
      !this._reordering &&
      this._todoListSupportsFeature(TodoListEntityFeature.DELETE_TODO_ITEM);
    if (!canReorder && !canDeleteDuplicates) {
      return nothing;
    }
    return html`<ha-dropdown
      @wa-select=${this._handlePrimaryMenuSelect}
      placement="bottom-end"
    >
      <ha-icon-button
        slot="trigger"
        .path=${mdiDotsVertical}
        .label=${this._i18n.localize("ui.common.menu")}
      ></ha-icon-button>
      ${
        canReorder
          ? html`<ha-dropdown-item value="reorder">
              ${this._i18n.localize(
                this._reordering
                  ? "ui.panel.lovelace.cards.todo-list.exit_reorder_items"
                  : "ui.panel.lovelace.cards.todo-list.reorder_items"
              )}
              <ha-svg-icon slot="icon" .path=${mdiSort}> </ha-svg-icon>
            </ha-dropdown-item>`
          : nothing
      }
      ${
        canDeleteDuplicates
          ? html`<ha-dropdown-item
              value="delete_duplicates"
              variant="danger"
              .disabled=${
                unavailable ||
                !this._getDuplicateItems(
                  this._items,
                  this._i18n.locale.language
                ).length
              }
            >
              ${this._i18n.localize(
                "ui.panel.lovelace.cards.todo-list.delete_duplicates"
              )}
              <ha-svg-icon slot="icon" .path=${mdiContentDuplicate}>
              </ha-svg-icon>
            </ha-dropdown-item>`
          : nothing
      }
    </ha-dropdown>`;
  }

  private _renderSwipeIndicator() {
    const indicator = this._swipeIndicator;
    if (!indicator) {
      return nothing;
    }
    const label =
      indicator.action === "delete"
        ? this._i18n.localize("ui.common.delete")
        : this._i18n.localize(
            indicator.action === "complete"
              ? "ui.panel.lovelace.cards.todo-list.swipe_complete"
              : "ui.panel.lovelace.cards.todo-list.swipe_reactivate"
          );
    return html`<div
      class=${classMap({
        "swipe-indicator": true,
        [indicator.action]: true,
        [indicator.side]: true,
        armed: indicator.armed,
      })}
      style=${styleMap({
        top: `${indicator.top}px`,
        height: `${indicator.height}px`,
      })}
      aria-hidden="true"
    >
      <ha-svg-icon .path=${SWIPE_ACTION_ICONS[indicator.action]}></ha-svg-icon>
      <span>${label}</span>
    </div>`;
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
          const swipeable = this._swipeEnabled(unavailable);
          const due = this._getDueDate(item);
          const today =
            due && !item.due!.includes("T") && isSameDay(new Date(), due);
          return html`
            <ha-check-list-item
              left
              .hasMeta=${showReorder || showDelete}
              class="editRow ${classMap({
                draggable: item.status !== TodoItemStatus.Completed,
                completed: item.status === TodoItemStatus.Completed,
                multiline: Boolean(item.description || item.due),
                swipeable,
              })}"
              .selected=${item.status === TodoItemStatus.Completed}
              .disabled=${unavailable}
              .checkboxDisabled=${!this._todoListSupportsFeature(
                TodoListEntityFeature.UPDATE_TODO_ITEM
              )}
              .indeterminate=${!item.status}
              .noninteractive=${!this._todoListSupportsFeature(
                TodoListEntityFeature.UPDATE_TODO_ITEM
              )}
              .itemId=${item.uid}
              @change=${this._completeItem}
              @click=${this._itemTap}
              separate-checkbox-click
              @request-selected=${this._requestSelected}
              @keydown=${this._handleKeydown}
              @pointerdown=${swipeable ? this._swipeStart : undefined}
              @pointermove=${swipeable ? this._swipeMove : undefined}
              @pointerup=${swipeable ? this._swipeEnd : undefined}
              @pointercancel=${swipeable ? this._swipeCancel : undefined}
            >
              <div class="column">
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
            </ha-check-list-item>
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

  private _requestSelected(ev: Event): void {
    ev.stopPropagation();
  }

  private _handleKeydown(ev) {
    if (ev.key === " ") {
      this._completeItem(ev);
      return;
    }
    if (ev.key === "Enter") {
      this._itemTap(ev);
    }
  }

  private _itemTap(ev): void {
    ev.stopPropagation();
    if (this._suppressNextTap) {
      this._suppressNextTap = false;
      return;
    }
    if (
      !this._config!.item_tap_action ||
      this._config!.item_tap_action === ITEM_TAP_ACTION_EDIT
    ) {
      this._openItem(ev);
    } else if (this._config!.item_tap_action === ITEM_TAP_ACTION_TOGGLE) {
      this._completeItem(ev);
    }
  }

  private _openItem(ev): void {
    ev.stopPropagation();

    if (
      ev
        .composedPath()
        .find((el) => ["input", "a", "button"].includes(el.localName))
    ) {
      return;
    }

    const item = this._getItem(ev.currentTarget.itemId);
    showTodoItemEditDialog(this, {
      entity: this._entityId!,
      item,
    });
  }

  private async _completeItem(ev): Promise<void> {
    let focusedIndex: number | undefined;
    let list: List | undefined;
    if (ev.type === "keydown") {
      list = this._list!;
      focusedIndex = list.getFocusedItemIndex();
    }
    const item = this._getItem(ev.currentTarget.itemId);
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
    } else if (ev.detail?.item?.value === "delete_duplicates") {
      this._deleteDuplicateItems();
    }
  }

  private _getDuplicateItems = memoizeOne(
    (items: TodoItem[] | undefined, language: string): TodoItem[] =>
      items ? findDuplicateTodoItems(items, language) : []
  );

  private _deleteDuplicateItems() {
    const uids = this._getDuplicateItems(
      this._items,
      this._i18n.locale.language
    ).map((item) => item.uid);
    if (!uids.length) {
      return;
    }
    showConfirmationDialog(this, {
      title: this._i18n.localize(
        "ui.panel.lovelace.cards.todo-list.delete_duplicates_confirm_title"
      ),
      text: this._i18n.localize(
        "ui.panel.lovelace.cards.todo-list.delete_duplicates_confirm_text",
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

  private _swipeEnabled(unavailable: boolean): boolean {
    return (
      Boolean(this._config?.swipe_actions) &&
      !unavailable &&
      !this._reordering &&
      this._todoListSupportsFeature(TodoListEntityFeature.UPDATE_TODO_ITEM)
    );
  }

  private _swipeStart(
    ev: PointerEvent & HASSDomCurrentTargetEvent<TodoListItemElement>
  ): void {
    if (!ev.isPrimary || ev.button !== 0) {
      return;
    }
    // Let interactive children (checkbox, buttons, links) handle their own pointer events
    if (
      ev
        .composedPath()
        .some(
          (el) =>
            el instanceof HTMLElement &&
            ["ha-checkbox", "ha-icon-button", "a", "button"].includes(
              el.localName
            )
        )
    ) {
      return;
    }
    this._swipe = {
      item: ev.currentTarget,
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      offset: 0,
      horizontal: false,
    };
  }

  private _swipeMove(ev: PointerEvent): void {
    const swipe = this._swipe;
    if (!swipe || swipe.pointerId !== ev.pointerId) {
      return;
    }
    const deltaX = ev.clientX - swipe.startX;
    const deltaY = ev.clientY - swipe.startY;
    if (!swipe.horizontal) {
      if (
        Math.abs(deltaY) > SWIPE_START_THRESHOLD &&
        Math.abs(deltaY) > Math.abs(deltaX)
      ) {
        // Vertical movement: leave it to scrolling
        this._swipe = undefined;
        return;
      }
      if (Math.abs(deltaX) < SWIPE_START_THRESHOLD) {
        return;
      }
      swipe.horizontal = true;
      swipe.item.setPointerCapture(ev.pointerId);
      swipe.item.classList.add("swiping");
    }
    ev.preventDefault();
    swipe.offset = deltaX;
    // Direct style updates avoid re-rendering the list on every pointer move
    swipe.item.style.transform = `translateX(${deltaX}px)`;
    this._updateSwipeIndicator(swipe);
  }

  private _updateSwipeIndicator(swipe: TodoSwipeState): void {
    const action = this._swipeAction(swipe, false);
    if (!action || swipe.offset === 0) {
      this._swipeIndicator = undefined;
      return;
    }
    const side = swipe.offset > 0 ? "left" : "right";
    const armed = Boolean(this._swipeAction(swipe));
    const current = this._swipeIndicator;
    // Only re-render when the visible state changes
    if (
      current &&
      current.action === action &&
      current.side === side &&
      current.armed === armed
    ) {
      return;
    }
    const card = this._card;
    if (!card) {
      return;
    }
    const cardRect = card.getBoundingClientRect();
    const itemRect = swipe.item.getBoundingClientRect();
    // Position relative to the card's padding box (inside its border) and snap
    // to whole pixels within the item, so the indicator never peeks out
    const offset = cardRect.top + card.clientTop - card.scrollTop;
    const top = Math.ceil(itemRect.top - offset);
    const bottom = Math.floor(itemRect.bottom - offset);
    this._swipeIndicator = {
      top,
      height: bottom - top,
      side,
      action,
      armed,
    };
  }

  private _swipeEnd(ev: PointerEvent): void {
    const swipe = this._swipe;
    if (!swipe || swipe.pointerId !== ev.pointerId) {
      return;
    }
    if (!swipe.horizontal) {
      this._swipe = undefined;
      return;
    }
    // The pointerup is followed by a click on the item, which would open the editor
    this._suppressNextTap = true;
    window.setTimeout(() => {
      this._suppressNextTap = false;
    }, 0);
    const action = this._swipeAction(swipe);
    this._resetSwipe();
    if (action) {
      this._performSwipeAction(swipe.item.itemId, action);
    }
  }

  private _swipeCancel(): void {
    this._resetSwipe();
  }

  private _resetSwipe(): void {
    const swipe = this._swipe;
    this._swipe = undefined;
    if (!swipe) {
      return;
    }
    swipe.item.classList.remove("swiping");
    swipe.item.style.transform = "";
    this._swipeIndicator = undefined;
  }

  private _swipeAction(
    swipe: TodoSwipeState,
    requireThreshold = true
  ): TodoSwipeAction | undefined {
    const width = swipe.item.clientWidth;
    const triggerDistance = Math.max(
      SWIPE_MIN_TRIGGER_DISTANCE,
      width * SWIPE_TRIGGER_RATIO
    );
    if (requireThreshold && Math.abs(swipe.offset) < triggerDistance) {
      return undefined;
    }
    const item = this._getItem(swipe.item.itemId);
    if (!item) {
      return undefined;
    }
    const rtl = getComputedStyle(swipe.item).direction === "rtl";
    const towardStart = rtl ? swipe.offset > 0 : swipe.offset < 0;
    return getTodoSwipeAction(
      item.status,
      towardStart ? "start" : "end",
      this._todoListSupportsFeature(TodoListEntityFeature.DELETE_TODO_ITEM)
    );
  }

  private _performSwipeAction(itemId: string, action: TodoSwipeAction) {
    const item = this._getItem(itemId);
    if (!item) {
      return;
    }
    if (action === "delete") {
      deleteItems(this._api.callService, this._entityId!, [item.uid]);
      return;
    }
    const status =
      action === "complete"
        ? TodoItemStatus.Completed
        : TodoItemStatus.NeedsAction;
    if (item.status === status) {
      return;
    }
    updateItem(this._api.callService, this._entityId!, {
      uid: item.uid,
      summary: item.summary,
      status,
    });
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
    while (item?.localName !== "ha-check-list-item") {
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

    const itemId = (items[oldIndex] as any).itemId as string;

    const prevItemId = (
      this._findFirstItem(
        items,
        newIndex,
        newIndex < oldIndex ? "up" : "down"
      ) as any
    )?.itemId;

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
      position: relative;
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

    ha-check-list-item {
      min-height: 40px;
      height: auto;
      --mdc-list-side-padding: var(--ha-space-5);
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
    }

    .completed .summary {
      text-decoration: line-through;
    }

    ha-check-list-item.swipeable {
      touch-action: pan-y;
      transition:
        transform var(--ha-animation-duration-fast, 150ms) ease-out,
        background-color var(--ha-animation-duration-fast, 150ms) ease-out;
    }

    ha-check-list-item.swiping {
      position: relative;
      z-index: 1;
      transition: none;
      user-select: none;
      background-color: var(--ha-card-background, var(--card-background-color));
    }

    .swipe-indicator {
      position: absolute;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
      padding: 0 var(--ha-space-5);
      box-sizing: border-box;
      font-weight: var(--ha-font-weight-medium);
      pointer-events: none;
      transition:
        background-color var(--ha-animation-duration-fast, 150ms) ease-out,
        color var(--ha-animation-duration-fast, 150ms) ease-out;
    }

    .swipe-indicator.right {
      justify-content: flex-end;
    }

    /* Subtle fill while swiping, loud fill once releasing triggers the action */
    .swipe-indicator.complete {
      background-color: var(--ha-color-fill-success-normal-resting);
      color: var(--ha-color-on-success-normal);
    }

    .swipe-indicator.complete.armed {
      background-color: var(--ha-color-fill-success-loud-resting);
      color: var(--ha-color-on-success-loud);
    }

    .swipe-indicator.uncomplete {
      background-color: var(--ha-color-fill-primary-normal-resting);
      color: var(--ha-color-on-primary-normal);
    }

    .swipe-indicator.uncomplete.armed {
      background-color: var(--ha-color-fill-primary-loud-resting);
      color: var(--ha-color-on-primary-loud);
    }

    .swipe-indicator.delete {
      background-color: var(--ha-color-fill-danger-normal-resting);
      color: var(--ha-color-on-danger-normal);
    }

    .swipe-indicator.delete.armed {
      background-color: var(--ha-color-fill-danger-loud-resting);
      color: var(--ha-color-on-danger-loud);
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
