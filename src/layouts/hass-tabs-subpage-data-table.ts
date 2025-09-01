import { ResizeController } from "@lit-labs/observers/resize-controller";
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiClose,
  mdiFilterVariant,
  mdiFilterVariantRemove,
  mdiFormatListChecks,
  mdiMenuDown,
  mdiTableCog,
  mdiUnfoldLessHorizontal,
  mdiUnfoldMoreHorizontal,
} from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/chips/ha-assist-chip";
import "../components/chips/ha-filter-chip";
import "../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  HaDataTable,
  SortingDirection,
} from "../components/data-table/ha-data-table";
import { showDataTableSettingsDialog } from "../components/data-table/show-dialog-data-table-settings";
import "../components/ha-dialog";
import "../components/ha-dialog-header";
import "../components/ha-md-button-menu";
import "../components/ha-md-divider";
import "../components/ha-md-menu-item";
import "../components/search-input-outlined";
import { KeyboardShortcutMixin } from "../mixins/keyboard-shortcut-mixin";
import type { HomeAssistant, Route } from "../types";
import "./hass-tabs-subpage";
import type { PageNavigation } from "./hass-tabs-subpage";

@customElement("hass-tabs-subpage-data-table")
export class HaTabsSubpageDataTable extends KeyboardShortcutMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public localizeFunc?: LocalizeFunc;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean }) public supervisor = false;

  @property({ type: Boolean, attribute: "main-page" }) public mainPage = false;

  @property({ attribute: false }) public initialCollapsedGroups: string[] = [];

  /**
   * Object with the columns.
   * @type {Object}
   */
  @property({ type: Object }) public columns: DataTableColumnContainer = {};

  /**
   * Data to show in the table.
   * @type {Array}
   */
  @property({ type: Array }) public data: DataTableRowData[] = [];

  /**
   * Should rows be selectable.
   * @type {Boolean}
   */
  @property({ type: Boolean }) public selectable = false;

  /**
   * Should rows be clickable.
   * @type {Boolean}
   */
  @property({ type: Boolean }) public clickable = false;

  /**
   * Do we need to add padding for a fab.
   * @type {Boolean}
   */
  @property({ attribute: "has-fab", type: Boolean }) public hasFab = false;

  /**
   * Add an extra row at the bottom of the data table
   * @type {TemplateResult}
   */
  @property({ attribute: false }) public appendRow?: TemplateResult;

  /**
   * Field with a unique id per entry in data.
   * @type {String}
   */
  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: String }) public id = "id";

  /**
   * String to filter the data in the data table on.
   * @type {String}
   */
  @property({ type: String }) public filter = "";

  @property({ attribute: false }) public searchLabel?: string;

  /**
   * Number of active filters.
   * @type {Number}
   */
  @property({ type: Number }) public filters?;

  /**
   * Number of current selections.
   * @type {Number}
   */
  @property({ type: Number }) public selected?;

  /**
   * What path to use when the back button is pressed.
   * @type {String}
   * @attr back-path
   */
  @property({ type: String, attribute: "back-path" }) public backPath?: string;

  /**
   * Function to call when the back button is pressed.
   * @type {() => void}
   */
  @property({ attribute: false }) public backCallback?: () => void;

  /**
   * String to show when there are no records in the data table.
   * @type {String}
   */
  @property({ attribute: false, type: String }) public noDataText?: string;

  /**
   * Hides the data table and show an empty message.
   * @type {Boolean}
   */
  @property({ type: Boolean }) public empty = false;

  @property({ attribute: false }) public route!: Route;

  /**
   * Array of tabs to show on the page.
   * @type {Array}
   */
  @property({ attribute: false }) public tabs: PageNavigation[] = [];

  /**
   * Show the filter menu.
   * @type {Boolean}
   */
  @property({ attribute: "has-filters", type: Boolean })
  public hasFilters = false;

  @property({ attribute: "show-filters", type: Boolean })
  public showFilters = false;

  @property({ attribute: false }) public initialSorting?: {
    column: string;
    direction: SortingDirection;
  };

  @property({ attribute: false }) public initialGroupColumn?: string;

  @property({ attribute: false }) public groupOrder?: string[];

  @property({ attribute: false }) public columnOrder?: string[];

  @property({ attribute: false }) public hiddenColumns?: string[];

  @state() private _sortColumn?: string;

  @state() private _sortDirection: SortingDirection = null;

  @state() private _groupColumn?: string;

  @state() private _selectMode = false;

  @query("ha-data-table", true) private _dataTable!: HaDataTable;

  @query("search-input-outlined") private _searchInput!: HTMLElement;

  protected supportedShortcuts(): SupportedShortcuts {
    return {
      f: () => this._searchInput.focus(),
    };
  }

  private _showPaneController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width > 750,
  });

  public clearSelection() {
    this._dataTable.clearSelection();
  }

  protected willUpdate() {
    if (this.hasUpdated) {
      return;
    }
    if (this.initialGroupColumn && this.columns[this.initialGroupColumn]) {
      this._setGroupColumn(this.initialGroupColumn);
    }
    if (this.initialSorting && this.columns[this.initialSorting.column]) {
      this._sortColumn = this.initialSorting.column;
      this._sortDirection = this.initialSorting.direction;
    }
  }

  protected render(): TemplateResult {
    const localize = this.localizeFunc || this.hass.localize;
    const showPane = this._showPaneController.value ?? !this.narrow;
    const filterButton = this.hasFilters
      ? html`<div class="relative">
          <ha-assist-chip
            .label=${localize("ui.components.subpage-data-table.filters")}
            .active=${this.filters}
            @click=${this._toggleFilters}
          >
            <ha-svg-icon slot="icon" .path=${mdiFilterVariant}></ha-svg-icon>
          </ha-assist-chip>
          ${this.filters
            ? html`<div class="badge">${this.filters}</div>`
            : nothing}
        </div>`
      : nothing;

    const selectModeBtn =
      this.selectable && !this._selectMode
        ? html`<ha-assist-chip
            class="has-dropdown select-mode-chip"
            .active=${this._selectMode}
            @click=${this._enableSelectMode}
            .title=${localize(
              "ui.components.subpage-data-table.enter_selection_mode"
            )}
          >
            <ha-svg-icon slot="icon" .path=${mdiFormatListChecks}></ha-svg-icon>
          </ha-assist-chip>`
        : nothing;

    const searchBar = html`<search-input-outlined
      .hass=${this.hass}
      .filter=${this.filter}
      @value-changed=${this._handleSearchChange}
      .label=${this.searchLabel}
      .placeholder=${this.searchLabel}
    >
    </search-input-outlined>`;

    const sortByMenu = Object.values(this.columns).find((col) => col.sortable)
      ? html`
          <ha-md-button-menu positioning="popover">
            <ha-assist-chip
              slot="trigger"
              .label=${localize("ui.components.subpage-data-table.sort_by", {
                sortColumn:
                  this._sortColumn && this.columns[this._sortColumn]
                    ? ` ${this.columns[this._sortColumn].title || this.columns[this._sortColumn].label}` ||
                      ""
                    : "",
              })}
            >
              <ha-svg-icon
                slot="trailing-icon"
                .path=${mdiMenuDown}
              ></ha-svg-icon>
            </ha-assist-chip>
            ${Object.entries(this.columns).map(([id, column]) =>
              column.sortable
                ? html`
                    <ha-md-menu-item
                      .value=${id}
                      @click=${this._handleSortBy}
                      @keydown=${this._handleSortBy}
                      keep-open
                      .selected=${id === this._sortColumn}
                      class=${classMap({ selected: id === this._sortColumn })}
                    >
                      ${this._sortColumn === id
                        ? html`
                            <ha-svg-icon
                              slot="end"
                              .path=${this._sortDirection === "desc"
                                ? mdiArrowDown
                                : mdiArrowUp}
                            ></ha-svg-icon>
                          `
                        : nothing}
                      ${column.title || column.label}
                    </ha-md-menu-item>
                  `
                : nothing
            )}
          </ha-md-button-menu>
        `
      : nothing;

    const groupByMenu = Object.values(this.columns).find((col) => col.groupable)
      ? html`
          <ha-md-button-menu positioning="popover">
            <ha-assist-chip
              .label=${localize("ui.components.subpage-data-table.group_by", {
                groupColumn:
                  this._groupColumn && this.columns[this._groupColumn]
                    ? ` ${this.columns[this._groupColumn].title || this.columns[this._groupColumn].label}`
                    : "",
              })}
              slot="trigger"
            >
              <ha-svg-icon
                slot="trailing-icon"
                .path=${mdiMenuDown}
              ></ha-svg-icon
            ></ha-assist-chip>
            ${Object.entries(this.columns).map(([id, column]) =>
              column.groupable
                ? html`
                    <ha-md-menu-item
                      .value=${id}
                      .clickAction=${this._handleGroupBy}
                      .selected=${id === this._groupColumn}
                      class=${classMap({ selected: id === this._groupColumn })}
                    >
                      ${column.title || column.label}
                    </ha-md-menu-item>
                  `
                : nothing
            )}
            <ha-md-menu-item
              .value=${""}
              .clickAction=${this._handleGroupBy}
              .selected=${!this._groupColumn}
              class=${classMap({ selected: !this._groupColumn })}
            >
              ${localize("ui.components.subpage-data-table.dont_group_by")}
            </ha-md-menu-item>
            <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>
            <ha-md-menu-item
              .clickAction=${this._collapseAllGroups}
              .disabled=${!this._groupColumn}
            >
              <ha-svg-icon
                slot="start"
                .path=${mdiUnfoldLessHorizontal}
              ></ha-svg-icon>
              ${localize(
                "ui.components.subpage-data-table.collapse_all_groups"
              )}
            </ha-md-menu-item>
            <ha-md-menu-item
              .clickAction=${this._expandAllGroups}
              .disabled=${!this._groupColumn}
            >
              <ha-svg-icon
                slot="start"
                .path=${mdiUnfoldMoreHorizontal}
              ></ha-svg-icon>
              ${localize("ui.components.subpage-data-table.expand_all_groups")}
            </ha-md-menu-item>
          </ha-md-button-menu>
        `
      : nothing;

    const settingsButton = html`<ha-assist-chip
      class="has-dropdown select-mode-chip"
      @click=${this._openSettings}
      .title=${localize("ui.components.subpage-data-table.settings")}
    >
      <ha-svg-icon slot="icon" .path=${mdiTableCog}></ha-svg-icon>
    </ha-assist-chip>`;

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .localizeFunc=${this.localizeFunc}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        .backPath=${this.backPath}
        .backCallback=${this.backCallback}
        .route=${this.route}
        .tabs=${this.tabs}
        .mainPage=${this.mainPage}
        .supervisor=${this.supervisor}
        .pane=${showPane && this.showFilters}
        @sorting-changed=${this._sortingChanged}
      >
        ${this._selectMode
          ? html`<div class="selection-bar" slot="toolbar">
              <div class="selection-controls">
                <ha-icon-button
                  .path=${mdiClose}
                  @click=${this._disableSelectMode}
                  .label=${localize(
                    "ui.components.subpage-data-table.exit_selection_mode"
                  )}
                ></ha-icon-button>
                <ha-md-button-menu>
                  <ha-assist-chip
                    .label=${localize(
                      "ui.components.subpage-data-table.select"
                    )}
                    slot="trigger"
                  >
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiFormatListChecks}
                    ></ha-svg-icon>
                    <ha-svg-icon
                      slot="trailing-icon"
                      .path=${mdiMenuDown}
                    ></ha-svg-icon
                  ></ha-assist-chip>
                  <ha-md-menu-item
                    .value=${undefined}
                    .clickAction=${this._selectAll}
                  >
                    <div slot="headline">
                      ${localize("ui.components.subpage-data-table.select_all")}
                    </div>
                  </ha-md-menu-item>
                  <ha-md-menu-item
                    .value=${undefined}
                    .clickAction=${this._selectNone}
                  >
                    <div slot="headline">
                      ${localize(
                        "ui.components.subpage-data-table.select_none"
                      )}
                    </div>
                  </ha-md-menu-item>
                  <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>
                  <ha-md-menu-item
                    .value=${undefined}
                    .clickAction=${this._disableSelectMode}
                  >
                    <div slot="headline">
                      ${localize(
                        "ui.components.subpage-data-table.exit_selection_mode"
                      )}
                    </div>
                  </ha-md-menu-item>
                </ha-md-button-menu>
                ${this.selected !== undefined
                  ? html`<p>
                      ${localize("ui.components.subpage-data-table.selected", {
                        selected: this.selected || "0",
                      })}
                    </p>`
                  : nothing}
              </div>
              <div class="center-vertical">
                <slot name="selection-bar"></slot>
              </div>
            </div>`
          : nothing}
        ${this.showFilters
          ? !showPane
            ? nothing
            : html`<div class="pane" slot="pane">
                <div class="table-header">
                  <ha-assist-chip
                    .label=${localize(
                      "ui.components.subpage-data-table.filters"
                    )}
                    active
                    @click=${this._toggleFilters}
                  >
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiFilterVariant}
                    ></ha-svg-icon>
                  </ha-assist-chip>
                  ${this.filters
                    ? html`<ha-icon-button
                        .path=${mdiFilterVariantRemove}
                        @click=${this._clearFilters}
                        .label=${localize(
                          "ui.components.subpage-data-table.clear_filter"
                        )}
                      ></ha-icon-button>`
                    : nothing}
                </div>
                <div class="pane-content">
                  <slot name="filter-pane"></slot>
                </div>
              </div>`
          : nothing}
        ${this.empty
          ? html`<div class="center">
              <slot name="empty">${this.noDataText}</slot>
            </div>`
          : html`<div slot="toolbar-icon">
                <slot name="toolbar-icon"></slot>
              </div>
              ${this.narrow
                ? html`
                    <div slot="header">
                      <slot name="header">
                        <div class="search-toolbar">${searchBar}</div>
                      </slot>
                    </div>
                  `
                : ""}
              <ha-data-table
                .hass=${this.hass}
                .localize=${localize}
                .narrow=${this.narrow}
                .columns=${this.columns}
                .data=${this.data}
                .noDataText=${this.noDataText}
                .filter=${this.filter}
                .selectable=${this._selectMode}
                .hasFab=${this.hasFab}
                .id=${this.id}
                .clickable=${this.clickable}
                .appendRow=${this.appendRow}
                .sortColumn=${this._sortColumn}
                .sortDirection=${this._sortDirection}
                .groupColumn=${this._groupColumn}
                .groupOrder=${this.groupOrder}
                .initialCollapsedGroups=${this.initialCollapsedGroups}
                .columnOrder=${this.columnOrder}
                .hiddenColumns=${this.hiddenColumns}
              >
                ${!this.narrow
                  ? html`
                      <div slot="header">
                        <slot name="top-header"></slot>
                        <slot name="header">
                          <div class="table-header">
                            ${this.hasFilters && !this.showFilters
                              ? html`${filterButton}`
                              : nothing}${selectModeBtn}${searchBar}${groupByMenu}${sortByMenu}${settingsButton}
                          </div>
                        </slot>
                      </div>
                    `
                  : html`
                      <div slot="header">
                        <slot name="top-header"></slot>
                      </div>
                      <div slot="header-row" class="narrow-header-row">
                        ${this.hasFilters && !this.showFilters
                          ? html`${filterButton}`
                          : nothing}
                        ${selectModeBtn}
                        <div class="flex"></div>
                        ${groupByMenu}${sortByMenu}${settingsButton}
                      </div>
                    `}
              </ha-data-table>`}
        <div slot="fab"><slot name="fab"></slot></div>
      </hass-tabs-subpage>
      ${this.showFilters && !showPane
        ? html`<ha-dialog
            open
            .heading=${localize("ui.components.subpage-data-table.filters")}
          >
            <ha-dialog-header slot="heading">
              <ha-icon-button
                slot="navigationIcon"
                .path=${mdiClose}
                @click=${this._toggleFilters}
                .label=${localize(
                  "ui.components.subpage-data-table.close_filter"
                )}
              ></ha-icon-button>
              <span slot="title"
                >${localize("ui.components.subpage-data-table.filters")}</span
              >
              ${this.filters
                ? html`<ha-icon-button
                    slot="actionItems"
                    @click=${this._clearFilters}
                    .path=${mdiFilterVariantRemove}
                    .label=${localize(
                      "ui.components.subpage-data-table.clear_filter"
                    )}
                  ></ha-icon-button>`
                : nothing}
            </ha-dialog-header>
            <div class="filter-dialog-content">
              <slot name="filter-pane"></slot>
            </div>
            <div slot="primaryAction">
              <ha-button @click=${this._toggleFilters}>
                ${localize("ui.components.subpage-data-table.show_results", {
                  number: this.data.length,
                })}
              </ha-button>
            </div>
          </ha-dialog>`
        : nothing}
    `;
  }

  private _clearFilters() {
    fireEvent(this, "clear-filter");
  }

  private _toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  private _sortingChanged(ev) {
    this._sortDirection = ev.detail.direction;
    this._sortColumn = this._sortDirection ? ev.detail.column : undefined;
  }

  private _handleSortBy(ev) {
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") return;

    const columnId = ev.currentTarget.value;
    if (!this._sortDirection || this._sortColumn !== columnId) {
      this._sortDirection = "asc";
    } else if (this._sortDirection === "asc") {
      this._sortDirection = "desc";
    } else {
      this._sortDirection = null;
    }
    this._sortColumn = this._sortDirection === null ? undefined : columnId;

    fireEvent(this, "sorting-changed", {
      column: columnId,
      direction: this._sortDirection,
    });
  }

  private _handleGroupBy = (item) => {
    this._setGroupColumn(item.value);
  };

  private _setGroupColumn(columnId: string) {
    this._groupColumn = columnId;
    fireEvent(this, "grouping-changed", { value: columnId });
  }

  private _openSettings() {
    showDataTableSettingsDialog(this, {
      columns: this.columns,
      hiddenColumns: this.hiddenColumns,
      columnOrder: this.columnOrder,
      onUpdate: (
        columnOrder: string[] | undefined,
        hiddenColumns: string[] | undefined
      ) => {
        this.columnOrder = columnOrder;
        this.hiddenColumns = hiddenColumns;
        fireEvent(this, "columns-changed", { columnOrder, hiddenColumns });
      },
      localizeFunc: this.localizeFunc,
    });
  }

  private _collapseAllGroups = () => {
    this._dataTable.collapseAllGroups();
  };

  private _expandAllGroups = () => {
    this._dataTable.expandAllGroups();
  };

  private _enableSelectMode() {
    this._selectMode = true;
  }

  private _disableSelectMode = () => {
    this._selectMode = false;
    this._dataTable.clearSelection();
  };

  private _selectAll = () => {
    this._dataTable.selectAll();
  };

  private _selectNone = () => {
    this._dataTable.clearSelection();
  };

  private _handleSearchChange(ev: CustomEvent) {
    if (this.filter === ev.detail.value) {
      return;
    }
    this.filter = ev.detail.value;
    fireEvent(this, "search-changed", { value: this.filter });
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    hass-tabs-subpage {
      background: var(--data-table-background-color);
      --tabs-subpage-content-padding-left: 0;
      --tabs-subpage-content-padding-right: 0;
    }

    ha-data-table {
      width: 100%;
      height: 100%;
      --data-table-border-width: 0;
      --data-row-padding-left: var(--safe-area-inset-left);
      --data-row-padding-right: var(--safe-area-inset-right);
    }
    :host(:not([narrow])) ha-data-table,
    .pane {
      height: calc(
        100vh - 1px - var(--header-height) - var(--safe-area-inset-top)
      );
      display: block;
    }

    .pane-content {
      height: calc(100vh - 1px - var(--header-height) - var(--header-height));
      display: flex;
      flex-direction: column;
    }

    :host([narrow]) hass-tabs-subpage {
      --main-title-margin: 0;
    }
    :host([narrow]) {
      --expansion-panel-summary-padding: 0 16px;
    }
    .table-header {
      display: flex;
      align-items: center;
      --mdc-shape-small: 0;
      height: 56px;
      width: 100%;
      justify-content: space-between;
      padding-left: max(16px, var(--safe-area-content-inset-left));
      padding-right: max(16px, var(--safe-area-content-inset-right));
      gap: 16px;
      box-sizing: border-box;
      background: var(--primary-background-color);
      border-bottom: 1px solid var(--divider-color);
    }
    search-input-outlined {
      flex: 1;
    }
    .search-toolbar {
      display: flex;
      align-items: center;
      color: var(--secondary-text-color);
    }
    .filters {
      --mdc-text-field-fill-color: var(--input-fill-color);
      --mdc-text-field-idle-line-color: var(--input-idle-line-color);
      --mdc-shape-small: 4px;
      --text-field-overflow: initial;
      display: flex;
      justify-content: flex-end;
      color: var(--primary-text-color);
    }
    .active-filters {
      color: var(--primary-text-color);
      position: relative;
      display: flex;
      align-items: center;
      padding: 2px 2px 2px 8px;
      margin-left: 4px;
      margin-inline-start: 4px;
      margin-inline-end: initial;
      font-size: var(--ha-font-size-m);
      width: max-content;
      cursor: initial;
      direction: var(--direction);
    }
    .active-filters ha-svg-icon {
      color: var(--primary-color);
    }
    .active-filters::before {
      background-color: var(--primary-color);
      opacity: 0.12;
      border-radius: 4px;
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      content: "";
    }
    .center {
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      box-sizing: border-box;
      height: 100%;
      width: 100%;
      padding: 16px;
    }

    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      inset-inline-end: -4px;
      inset-inline-start: initial;
      min-width: 16px;
      box-sizing: border-box;
      border-radius: 50%;
      font-size: var(--ha-font-size-xs);
      font-weight: var(--ha-font-weight-normal);
      background-color: var(--primary-color);
      line-height: var(--ha-line-height-normal);
      text-align: center;
      padding: 0px 2px;
      color: var(--text-primary-color);
    }

    .narrow-header-row {
      display: flex;
      align-items: center;
      min-width: 100%;
      gap: 16px;
      padding: 0 16px;
      box-sizing: border-box;
      overflow-x: scroll;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .narrow-header-row .flex {
      flex: 1;
      margin-left: -16px;
    }

    .selection-bar {
      background: rgba(var(--rgb-primary-color), 0.1);
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      box-sizing: border-box;
      font-size: var(--ha-font-size-m);
      --ha-assist-chip-container-color: var(--card-background-color);
    }

    .selection-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .selection-controls p {
      margin-left: 8px;
      margin-inline-start: 8px;
      margin-inline-end: initial;
    }

    .center-vertical {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .relative {
      position: relative;
    }

    ha-assist-chip {
      --ha-assist-chip-container-shape: 10px;
      --ha-assist-chip-container-color: var(--card-background-color);
    }

    .select-mode-chip {
      --md-assist-chip-icon-label-space: 0;
      --md-assist-chip-trailing-space: 8px;
    }

    ha-dialog {
      --mdc-dialog-min-width: calc(
        100vw - var(--safe-area-inset-right) - var(--safe-area-inset-left)
      );
      --mdc-dialog-max-width: calc(
        100vw - var(--safe-area-inset-right) - var(--safe-area-inset-left)
      );
      --mdc-dialog-min-height: 100%;
      --mdc-dialog-max-height: 100%;
      --vertical-align-dialog: flex-end;
      --ha-dialog-border-radius: 0;
      --dialog-content-padding: 0;
    }

    .filter-dialog-content {
      height: calc(100vh - 1px - 61px - var(--header-height));
      display: flex;
      flex-direction: column;
    }

    ha-md-button-menu ha-assist-chip {
      --md-assist-chip-trailing-space: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-tabs-subpage-data-table": HaTabsSubpageDataTable;
  }

  // for fire event
  interface HASSDomEvents {
    "search-changed": { value: string };
    "grouping-changed": { value: string };
    "columns-changed": {
      columnOrder: string[] | undefined;
      hiddenColumns: string[] | undefined;
    };
    "clear-filter": undefined;
  }
}
