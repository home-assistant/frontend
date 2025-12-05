import type { List } from "@material/mwc-list/mwc-list";
import type { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import {
  mdiClock,
  mdiDelete,
  mdiDeleteSweep,
  mdiDotsVertical,
  mdiDrag,
  mdiFilter,
  mdiPlus,
  mdiSort,
} from "@mdi/js";
import { endOfDay, isSameDay } from "date-fns";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValueMap, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import "../../../components/ha-card";
import "../../../components/ha-check-list-item";
import "../../../components/ha-checkbox";
import "../../../components/ha-date-input";
import "../../../components/ha-icon-button";
import "../../../components/ha-list";
import "../../../components/ha-list-item";
import "../../../components/ha-markdown-element";
import "../../../components/ha-relative-time";
import "../../../components/ha-select";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import { isUnavailableState } from "../../../data/entity";
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
import type { HomeAssistant } from "../../../types";
import { showTodoItemEditDialog } from "../../todo/show-dialog-todo-item-editor";
import { findEntities } from "../common/find-entities";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { TodoListCardConfig } from "./types";

export const ITEM_TAP_ACTION_EDIT = "edit";
export const ITEM_TAP_ACTION_TOGGLE = "toggle";

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

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: TodoListCardConfig;

  @state() private _entityId?: string;

  @state() private _items?: TodoItem[];

  @state() private _reordering = false;

  @state() private _filterOpen = false;

  @state() private _filterPriorities: string[] = [];

  @state() private _filterDateFrom: string | null = null;

  @state() private _filterDateTo: string | null = null;

  @state() private _sortMode: "priority_desc" | "priority_asc" | "none" =
    "none";

  @state() private _sortPanelOpen = false;

  private _unsubItems?: Promise<UnsubscribeFunc>;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._subscribeItems();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubItems?.then((unsub) => unsub());
    this._unsubItems = undefined;
  }

  public getCardSize(): number {
    return (this._config ? (this._config.title ? 2 : 0) : 0) + 3;
  }

  public setConfig(config: TodoListCardConfig): void {
    this.checkConfig(config);

    this._config = config;
    this._entityId = config.entity;

    // Restore sort mode from config if saved
    if (config.display_order === "priority_desc") {
      this._sortMode = "priority_desc";
    } else if (config.display_order === "priority_asc") {
      this._sortMode = "priority_asc";
    } else {
      this._sortMode = "none";
    }
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

  private _sortItems(items: TodoItem[], sort?: string): TodoItem[] {
    if (sort === "priority_desc" || sort === "priority_asc") {
      const descending = sort === "priority_desc";

      const getPriorityValue = (
        priority: number | string | null | undefined
      ): number => {
        if (priority == null) return 0;
        if (typeof priority === "number") return priority;

        const p = priority.toString().trim().toLowerCase();
        switch (p) {
          case "urgent":
          case "4":
            return 4;
          case "high":
          case "3":
            return 3;
          case "medium":
          case "2":
            return 2;
          case "low":
          case "1":
            return 1;
          default:
            return 0;
        }
      };

      return [...items].sort((a, b) => {
        const prioA = getPriorityValue(a.priority);
        const prioB = getPriorityValue(b.priority);
        return descending ? prioB - prioA : prioA - prioB;
      });
    }

    // Keep all your existing other sort modes (alpha, due date, etc.)
    if (sort === TodoSortMode.ALPHA_ASC || sort === TodoSortMode.ALPHA_DESC) {
      const sortOrder = sort === TodoSortMode.ALPHA_ASC ? 1 : -1;
      return items.sort(
        (a, b) =>
          sortOrder *
          caseInsensitiveStringCompare(
            a.summary,
            b.summary,
            this.hass?.locale.language
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
        return aDue === bDue ? 0 : aDue < bDue ? -sortOrder : sortOrder;
      });
    }

    return items; // no sorting
  }

  private _applyFilters(items: TodoItem[]): TodoItem[] {
    if (
      this._filterPriorities.length === 0 &&
      !this._filterDateFrom &&
      !this._filterDateTo
    ) {
      return items;
    }

    return items.filter((item) => {
      // Priority filter
      if (this._filterPriorities.length > 0) {
        const priority = item.priority?.toString().toLowerCase();
        const matchesPriority =
          (this._filterPriorities.includes("urgent") &&
            ["urgent", "4"].includes(priority!)) ||
          (this._filterPriorities.includes("high") &&
            ["high", "3"].includes(priority!)) ||
          (this._filterPriorities.includes("medium") &&
            ["medium", "2"].includes(priority!)) ||
          (this._filterPriorities.includes("low") &&
            ["low", "1"].includes(priority!));
        if (!matchesPriority) return false;
      }

      // Date filter
      const dueDate = this._getDueDate(item);
      if (dueDate) {
        if (this._filterDateFrom && dueDate < new Date(this._filterDateFrom))
          return false;
        if (this._filterDateTo) {
          const toDate = new Date(this._filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (dueDate > toDate) return false;
        }
      } else if (this._filterDateFrom || this._filterDateTo) {
        // Item has no due date, but user wants date filter → hide
        return false;
      }

      return true;
    });
  }

  private _handlePriorityChange(p: string) {
    if (this._filterPriorities.includes(p)) {
      this._filterPriorities = this._filterPriorities.filter((x) => x !== p);
    } else {
      this._filterPriorities = [...this._filterPriorities, p];
    }
    this.requestUpdate();
  }

  private _createPriorityHandler(priority: string) {
    return () => this._handlePriorityChange(priority);
  }

  private _setDateFrom(e: CustomEvent) {
    this._filterDateFrom = e.detail.value || null;
    this.requestUpdate();
  }

  private _setDateTo(e: CustomEvent) {
    this._filterDateTo = e.detail.value || null;
    this.requestUpdate();
  }

  private _closeFilterPanel() {
    this._filterOpen = false;
  }

  private _clearFilters() {
    this._filterPriorities = [];
    this._filterDateFrom = null;
    this._filterDateTo = null;
    this.requestUpdate();
  }

  private _toggleFilterPanel() {
    this._filterOpen = !this._filterOpen;
  }

  private _clearAndClose() {
    this._clearFilters();
    this._filterOpen = false;
  }

  private _toggleSortPanel() {
    this._sortPanelOpen = !this._sortPanelOpen;
  }
  private _closeSortPanel() {
    this._sortPanelOpen = false;
  }

  private _getUncheckedAndItemsWithoutStatus = memoizeOne(
    (items?: TodoItem[], sort?: string, _filterKey?: string): TodoItem[] => {
      if (!items) return [];
      const filtered = this._applyFilters(items);
      return this._sortItems(
        filtered.filter(
          (item) => item.status === TodoItemStatus.NeedsAction || !item.status
        ),
        sort
      );
    }
  );

  private _getCheckedItems = memoizeOne(
    (items?: TodoItem[], sort?: string, _filterKey?: string): TodoItem[] => {
      if (!items) return [];
      const filtered = this._applyFilters(items);
      return this._sortItems(
        filtered.filter((item) => item.status === TodoItemStatus.Completed),
        sort
      );
    }
  );

  private _getUncheckedItems = memoizeOne(
    (items?: TodoItem[], sort?: string, _filterKey?: string): TodoItem[] => {
      if (!items) return [];
      const filtered = this._applyFilters(items);
      return this._sortItems(
        filtered.filter((item) => item.status === TodoItemStatus.NeedsAction),
        sort
      );
    }
  );

  private _getItemsWithoutStatus = memoizeOne(
    (items?: TodoItem[], sort?: string, _filterKey?: string): TodoItem[] => {
      if (!items) return [];
      const filtered = this._applyFilters(items);
      return this._sortItems(
        filtered.filter((item) => !item.status),
        sort
      );
    }
  );

  public willUpdate(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (!this.hasUpdated) {
      if (!this._entityId) {
        this._entityId = this.getEntityId();
      }
      this._subscribeItems();
    } else if (changedProperties.has("_entityId") || !this._items) {
      this._items = undefined;
      this._subscribeItems();
    }
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
  }

  protected render() {
    if (!this._config || !this.hass || !this._entityId) {
      return nothing;
    }

    const stateObj = this.hass.states[this._entityId];

    if (!stateObj) {
      return html`
        <hui-warning .hass=${this.hass}>
          ${createEntityNotFoundWarning(this.hass, this._entityId)}
        </hui-warning>
      `;
    }

    const unavailable = isUnavailableState(stateObj.state);
    // Unique key that changes whenever any filter changes
    const filterKey = `${this._filterPriorities.join(",")}|${this._filterDateFrom || ""}|${this._filterDateTo || ""}`;

    const checkedItems = this._getCheckedItems(
      this._items,
      this._config.display_order,
      filterKey
    );
    const uncheckedItems = this._getUncheckedItems(
      this._items,
      this._config.display_order,
      filterKey
    );
    const itemsWithoutStatus = this._getItemsWithoutStatus(
      this._items,
      this._config.display_order,
      filterKey
    );
    const reorderableItems = this._reordering
      ? this._getUncheckedAndItemsWithoutStatus(
          this._items,
          this._config.display_order,
          filterKey
        )
      : undefined;

    return html`
      <ha-card
        .header=${this._config.title}
        class=${classMap({
          "has-header": "title" in this._config,
        })}
      >
        ${!this._config.hide_create &&
        this._todoListSupportsFeature(TodoListEntityFeature.CREATE_TODO_ITEM)
          ? html`
              <div class="addRow">
                <ha-textfield
                  class="addBox"
                  .placeholder=${this.hass!.localize(
                    "ui.panel.lovelace.cards.todo-list.add_item"
                  )}
                  @keydown=${this._addKeyPress}
                  .disabled=${unavailable}
                ></ha-textfield>
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
              </div>
            `
          : nothing}
        <ha-sortable
          handle-selector="ha-svg-icon"
          draggable-selector=".draggable"
          .disabled=${!this._reordering}
          @item-moved=${this._itemMoved}
        >
          <ha-list wrapFocus multi>
            ${!uncheckedItems.length && !itemsWithoutStatus.length
              ? html`<p class="empty">
                  ${this.hass.localize(
                    "ui.panel.lovelace.cards.todo-list.no_unchecked_items"
                  )}
                </p>`
              : this._reordering
                ? html`<div class="header" role="seperator">
                      <h2>
                        ${this.hass!.localize(
                          "ui.panel.lovelace.cards.todo-list.reorder_items"
                        )}
                      </h2>
                      ${this._renderMenu(this._config, unavailable)}
                    </div>
                    ${this._renderItems(reorderableItems ?? [], unavailable)}`
                : nothing}
            ${!this._reordering && uncheckedItems.length
              ? html`
                  <div class="header" role="seperator">
                    <h2>
                      ${this.hass!.localize(
                        "ui.panel.lovelace.cards.todo-list.unchecked_items"
                      )}
                    </h2>
                    ${this._renderMenu(this._config, unavailable)}
                  </div>
                  ${this._renderItems(uncheckedItems, unavailable)}
                `
              : nothing}
            ${!this._reordering && itemsWithoutStatus.length
              ? html`
                  <div>
                    ${uncheckedItems.length
                      ? html`<div class="divider" role="seperator"></div>`
                      : nothing}
                    <div class="header" role="seperator">
                      <h2>
                        ${this.hass!.localize(
                          "ui.panel.lovelace.cards.todo-list.no_status_items"
                        )}
                      </h2>
                      ${!uncheckedItems.length
                        ? this._renderMenu(this._config, unavailable)
                        : nothing}
                    </div>
                  </div>
                  ${this._renderItems(itemsWithoutStatus, unavailable)}
                `
              : nothing}
            ${!this._config.hide_completed && checkedItems.length
              ? html`
                  <div>
                    <div class="divider" role="separator"></div>
                    <div class="header">
                      <h2>
                        ${this.hass!.localize(
                          "ui.panel.lovelace.cards.todo-list.checked_items"
                        )}
                      </h2>
                      ${this._todoListSupportsFeature(
                        TodoListEntityFeature.DELETE_TODO_ITEM
                      )
                        ? html`<ha-button-menu
                            @closed=${stopPropagation}
                            fixed
                            @action=${this._handleCompletedMenuAction}
                          >
                            <ha-icon-button
                              slot="trigger"
                              .path=${mdiDotsVertical}
                            ></ha-icon-button>
                            <ha-list-item graphic="icon" class="warning">
                              ${this.hass!.localize(
                                "ui.panel.lovelace.cards.todo-list.clear_items"
                              )}
                              <ha-svg-icon
                                class="warning"
                                slot="graphic"
                                .path=${mdiDeleteSweep}
                                .disabled=${unavailable}
                              >
                              </ha-svg-icon>
                            </ha-list-item>
                          </ha-button-menu>`
                        : nothing}
                    </div>
                  </div>
                  ${this._renderItems(checkedItems, unavailable)}
                `
              : nothing}
          </ha-list>
        </ha-sortable>
      </ha-card>
    `;
  }

  private _renderMenu(config: TodoListCardConfig, unavailable: boolean) {
    const hasActiveFilter =
      this._filterPriorities.length > 0 ||
      this._filterDateFrom ||
      this._filterDateTo;

    const isSorted = this._sortMode !== "none";

    return html`
      <div class="sort-buttons">
        <!-- Sort Button (opens panel like filter) -->
        <ha-icon-button
          .path=${mdiSort}
          .title=${isSorted ? "Sort active" : "Sort items"}
          class=${classMap({ active: isSorted || this._sortPanelOpen })}
          @click=${this._toggleSortPanel}
          .disabled=${unavailable}
        ></ha-icon-button>

        <!-- Filter Button -->
        <ha-icon-button
          .path=${mdiFilter}
          .title=${hasActiveFilter ? "Filter active" : "Filter items"}
          class=${classMap({ active: hasActiveFilter || this._filterOpen })}
          @click=${this._toggleFilterPanel}
          .disabled=${unavailable}
        ></ha-icon-button>

        <!-- Reorder menu -->
        ${config.display_order === TodoSortMode.NONE &&
        this._todoListSupportsFeature(TodoListEntityFeature.MOVE_TODO_ITEM)
          ? html`
              <ha-button-menu
                @closed=${stopPropagation}
                fixed
                @action=${this._handlePrimaryMenuAction}
              >
                <ha-icon-button
                  slot="trigger"
                  .path=${mdiDotsVertical}
                ></ha-icon-button>
                <ha-list-item graphic="icon">
                  ${this.hass!.localize(
                    this._reordering
                      ? "ui.panel.lovelace.cards.todo-list.exit_reorder_items"
                      : "ui.panel.lovelace.cards.todo-list.reorder_items"
                  )}
                  <ha-svg-icon slot="graphic" .path=${mdiSort}></ha-svg-icon>
                </ha-list-item>
              </ha-button-menu>
            `
          : nothing}
      </div>

      <!-- Sort Panel (same style as filter panel) -->
      ${this._sortPanelOpen
        ? html`
            <div class="filter-overlay" @click=${this._closeSortPanel}></div>
            <div class="sort-panel">
              <div class="sort-section">
                <strong>Sort by Priority</strong>
                <div class="sort-options">
                  <label>
                    <ha-radio
                      name="sort"
                      value="none"
                      .checked=${this._sortMode === "none"}
                      @change=${this._handleSortChange.bind(this, "none")}
                    ></ha-radio>
                    <span>Default order</span>
                  </label>
                  <label>
                    <ha-radio
                      name="sort"
                      value="priority_desc"
                      .checked=${this._sortMode === "priority_desc"}
                      @change=${this._handleSortChange.bind(
                        this,
                        "priority_desc"
                      )}
                    ></ha-radio>
                    <span>Urgent to Low</span>
                  </label>
                  <label>
                    <ha-radio
                      name="sort"
                      value="priority_asc"
                      .checked=${this._sortMode === "priority_asc"}
                      @change=${this._handleSortChange.bind(
                        this,
                        "priority_asc"
                      )}
                    ></ha-radio>
                    <span>Low to Urgent</span>
                  </label>
                </div>
              </div>
            </div>
          `
        : nothing}

      <!-- Keep your existing Filter Panel below -->
      ${this._filterOpen
        ? html`
            <div class="filter-overlay" @click=${this._closeFilterPanel}></div>
            <div class="filter-panel">
              <!-- your existing filter content -->
              <div class="filter-section">
                <strong>Priority</strong>
                <div class="priority-filters">
                  ${["urgent", "high", "medium", "low"].map(
                    (p) => html`
                      <label>
                        <ha-checkbox
                          .checked=${this._filterPriorities.includes(p)}
                          @change=${this._createPriorityHandler(p)}
                        ></ha-checkbox>
                        <span class="priority-${p}">
                          ${p.charAt(0).toUpperCase() + p.slice(1)}
                        </span>
                      </label>
                    `
                  )}
                </div>
              </div>

              <div class="filter-section">
                <strong>Due Date</strong>
                <div class="date-filters">
                  <ha-date-input
                    .hass=${this.hass}
                    .locale=${this.hass?.locale}
                    .label=${"From"}
                    .value=${this._filterDateFrom}
                    @value-changed=${this._setDateFrom}
                  ></ha-date-input>
                  <ha-date-input
                    .hass=${this.hass}
                    .locale=${this.hass?.locale}
                    .label=${"To"}
                    .value=${this._filterDateTo}
                    @value-changed=${this._setDateTo}
                  ></ha-date-input>
                </div>
              </div>

              <div class="filter-actions">
                <ha-button @click=${this._clearAndClose}
                  >Clear filters</ha-button
                >
              </div>
            </div>
          `
        : nothing}
    `;
  }

  // private _handleSortChange(mode: "none" | "priority_desc" | "priority_asc") {
  //   this._sortMode = mode;
  //   this._sortPanelOpen = false;

  //   const newConfig = {
  //     ...this._config!,
  //     display_order: mode === "none" ? TodoSortMode.NONE : mode,
  //   };

  //   this._config = newConfig;
  //   fireEvent(this, "config-changed", { config: newConfig });
  // }

  private _handleSortChange(mode: "none" | "priority_desc" | "priority_asc") {
    this._sortMode = mode;
    this._sortPanelOpen = false;

    const newConfig = {
      ...this._config!,
      display_order: mode === "none" ? TodoSortMode.NONE : mode,
    };

    this._config = newConfig;
    fireEvent(this, "config-changed", { config: newConfig });
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
            <ha-check-list-item
              left
              .hasMeta=${showReorder || showDelete}
              class="editRow ${classMap({
                draggable: item.status !== TodoItemStatus.Completed,
                completed: item.status === TodoItemStatus.Completed,
                multiline: Boolean(item.description || item.due),
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
              @request-selected=${this._requestSelected}
              @keydown=${this._handleKeydown}
            >
              <div class="column">
                <span class="summary">${item.summary}</span>
                <span
                  class="summary priority priority-${item.priority?.toLowerCase()}"
                >
                  Priority: ${item.priority || "None"}
                </span>
                ${item.description
                  ? html`<ha-markdown-element
                      class="description"
                      .content=${item.description}
                    ></ha-markdown-element>`
                  : nothing}
                ${due
                  ? html`<div class="due ${due < new Date() ? "overdue" : ""}">
                      <ha-svg-icon .path=${mdiClock}></ha-svg-icon>${today
                        ? this.hass!.localize(
                            "ui.panel.lovelace.cards.todo-list.today"
                          )
                        : html`<ha-relative-time
                            capitalize
                            .hass=${this.hass}
                            .datetime=${due}
                          ></ha-relative-time>`}
                    </div>`
                  : nothing}
              </div>
              ${showReorder
                ? html`
                    <ha-svg-icon
                      .title=${this.hass!.localize(
                        "ui.panel.lovelace.cards.todo-list.drag_and_drop"
                      )}
                      class="reorderButton handle"
                      .path=${mdiDrag}
                      slot="meta"
                    >
                    </ha-svg-icon>
                  `
                : showDelete
                  ? html`<ha-icon-button
                      .title=${this.hass!.localize(
                        "ui.panel.lovelace.cards.todo-list.delete_item"
                      )}
                      class="deleteItemButton"
                      .path=${mdiDelete}
                      .itemId=${item.uid}
                      slot="meta"
                      @click=${this._deleteItem}
                    >
                    </ha-icon-button>`
                  : nothing}
            </ha-check-list-item>
          `;
        }
      )}
    `;
  }

  private _todoListSupportsFeature(feature: number): boolean {
    const entityStateObj = this.hass!.states[this._entityId!];
    return entityStateObj && supportsFeature(entityStateObj, feature);
  }

  private async _subscribeItems(): Promise<void> {
    if (this._unsubItems) {
      this._unsubItems.then((unsub) => unsub());
      this._unsubItems = undefined;
    }
    if (!this.hass || !this._entityId) {
      return;
    }
    if (!(this._entityId in this.hass.states)) {
      return;
    }
    this._unsubItems = subscribeItems(this.hass!, this._entityId, (update) => {
      this._items = update.items;
    });
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
      list = this.renderRoot.querySelector("ha-list")!;
      focusedIndex = list.getFocusedItemIndex();
    }
    const item = this._getItem(ev.currentTarget.itemId);
    if (!item) {
      return;
    }
    await updateItem(this.hass!, this._entityId!, {
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

  private _handleCompletedMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._clearCompletedItems();
        break;
    }
  }

  private _clearCompletedItems() {
    if (!this.hass) {
      return;
    }
    const checkedItems = this._getCheckedItems(this._items);
    const uids = checkedItems.map((item: TodoItem) => item.uid);
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.lovelace.cards.todo-list.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.lovelace.cards.todo-list.delete_confirm_text",
        { number: uids.length }
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: () => {
        deleteItems(this.hass!, this._entityId!, uids);
      },
    });
  }

  private get _newItem(): HaTextField {
    return this.shadowRoot!.querySelector(".addBox") as HaTextField;
  }

  private _addItem(ev): void {
    const newItem = this._newItem;
    if (newItem.value!.length > 0) {
      createItem(this.hass!, this._entityId!, {
        summary: newItem.value!,
      });
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
    deleteItems(this.hass!, this._entityId!, [item.uid]);
  }

  private _addKeyPress(ev): void {
    if (ev.key === "Enter") {
      this._addItem(null);
    }
  }

  private _handlePrimaryMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._toggleReorder();
        break;
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

    const list = this.renderRoot.querySelector("ha-list")!;

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

    await moveItem(this.hass!, this._entityId!, itemId, prevItemId);
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
      position: absolute;
      right: 16px;
      inset-inline-start: initial;
      inset-inline-end: 16px;
    }

    .addRow,
    .header {
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    .header {
      padding-left: 30px;
      padding-right: 16px;
      padding-inline-start: 30px;
      padding-inline-end: 16px;
      margin-top: 8px;
      justify-content: space-between;
      direction: var(--direction);
    }

    .header h2 {
      color: var(--primary-text-color);
      font-size: inherit;
      font-weight: var(--ha-font-weight-medium);
    }

    .empty {
      padding: 16px 32px;
      display: inline-block;
    }

    .item {
      margin-top: 8px;
    }

    ha-check-list-item {
      --mdc-list-item-meta-size: 56px;
      min-height: 56px;
      height: auto;
    }

    ha-check-list-item.multiline {
      align-items: flex-start;
      --check-list-item-graphic-margin-top: 8px;
    }

    .row {
      display: flex;
      justify-content: space-between;
    }

    .multiline .column {
      display: flex;
      flex-direction: column;
      margin-top: 18px;
      margin-bottom: 12px;
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
      padding: 16px 4px;
    }

    .deleteItemButton {
      position: relative;
      left: 8px;
      inset-inline-start: 8px;
      inset-inline-end: initial;
    }

    ha-textfield {
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

    .priority-low {
      color: #b0b0b0 !important;
    }

    .priority-medium {
      color: #03a9f4 !important;
    }

    .priority-high {
      color: #ff9800 !important;
      font-weight: 600 !important;
    }

    .priority-urgent {
      color: #db4437 !important;
      font-weight: 600 !important;
    }

    .sort-buttons {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .sort-buttons ha-icon-button.active {
      color: var(--primary-color);
    }

    /* Optional: make active icon bolder */
    .sort-buttons ha-icon-button.active {
      --mdc-icon-button-state-layer-color: var(--primary-color);
    }

    .sort-buttons {
      position: relative; /* Important: makes the panel position correctly */
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .filter-panel {
      position: absolute;
      top: 48px;
      right: 16px;
      width: 340px;
      background: var(--card-background-color, white);
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      z-index: 10;
      direction: ltr;
    }

    .filter-section {
      margin-bottom: 20px;
    }

    .filter-section strong {
      display: block;
      margin-bottom: 10px;
      color: var(--primary-text-color);
      font-weight: 500;
    }

    /* PERFECTLY ALIGNED PRIORITY CHECKBOXES */
    .priority-filters {
      display: flex;
      flex-direction: column;
      gap: 11px;
      margin-top: 6px;
    }

    .priority-filters label {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      cursor: pointer;
      user-select: none;
    }

    .priority-filters ha-checkbox {
      --mdc-checkbox-touch-target-size: 40px;
      flex-shrink: 0;
    }

    .priority-filters span {
      font-weight: 500;
      line-height: 20px;
      color: var(--primary-text-color);
    }

    /* Match your card’s priority colors */
    .priority-filters .priority-urgent {
      color: #db4437;
    }
    .priority-filters .priority-high {
      color: #ff9800;
    }
    .priority-filters .priority-medium {
      color: #03a9f4;
    }
    .priority-filters .priority-low {
      color: #b0b0b0;
    }

    .date-filters {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 8px;
    }

    .filter-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--divider-color);
    }

    .filter-actions ha-button {
      --mdc-theme-primary: var(--primary-color);
    }

    ha-card {
      overflow: visible !important;
    }

    .sort-buttons ha-icon-button.active {
      color: var(--primary-color);
      --mdc-icon-button-state-layer-color: var(--primary-color);
    }

    .filter-overlay {
      position: fixed;
      inset: 0;
      background: transparent;
      z-index: 9;
    }

    .date-filters ha-date-input {
      width: 100%;
    }

    .sort-panel {
      position: absolute;
      top: 48px;
      right: 16px;
      width: 280px;
      background: var(--card-background-color, white);
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      z-index: 10;
      direction: ltr;
    }

    .sort-section {
      margin-bottom: 8px;
    }

    .sort-section strong {
      display: block;
      margin-bottom: 12px;
      color: var(--primary-text-color);
      font-weight: 500;
    }

    .sort-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sort-options label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      user-select: none;
    }

    .sort-options span {
      font-weight: 500;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-todo-list-card": HuiTodoListCard;
  }
}
