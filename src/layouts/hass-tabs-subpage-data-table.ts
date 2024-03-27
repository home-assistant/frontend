import { ResizeController } from "@lit-labs/observers/resize-controller";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import "@material/mwc-button/mwc-button";
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiClose,
  mdiFilterRemove,
  mdiFilterVariant,
  mdiFormatListChecks,
  mdiMenuDown,
} from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { LocalizeFunc } from "../common/translations/localize";
import "../components/chips/ha-assist-chip";
import "../components/chips/ha-filter-chip";
import "../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  HaDataTable,
  SortingDirection,
} from "../components/data-table/ha-data-table";
import "../components/ha-dialog";
import "../components/search-input-outlined";
import type { HomeAssistant, Route } from "../types";
import "./hass-tabs-subpage";
import type { PageNavigation } from "./hass-tabs-subpage";

declare global {
  // for fire event
  interface HASSDomEvents {
    "search-changed": { value: string };
    "clear-filter": undefined;
  }
}

@customElement("hass-tabs-subpage-data-table")
export class HaTabsSubpageDataTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public localizeFunc?: LocalizeFunc;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean }) public supervisor = false;

  @property({ type: Boolean, attribute: "main-page" }) public mainPage = false;

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
  @property({ type: Boolean }) public hasFab = false;

  /**
   * Add an extra row at the bottom of the data table
   * @type {TemplateResult}
   */
  @property({ attribute: false }) public appendRow?: TemplateResult;

  /**
   * Field with a unique id per entry in data.
   * @type {String}
   */
  @property({ type: String }) public id = "id";

  /**
   * String to filter the data in the data table on.
   * @type {String}
   */
  @property({ type: String }) public filter = "";

  @property() public searchLabel?: string;

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
  @property({ type: String }) public noDataText?: string;

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
  @property({ type: Boolean }) public hasFilters = false;

  @property({ type: Boolean }) public showFilters = false;

  @property() public initialGroupColumn?: string;

  @state() private _sortColumn?: string;

  @state() private _sortDirection: SortingDirection = null;

  @state() private _groupColumn?: string;

  @state() private _selectMode = false;

  @query("ha-data-table", true) private _dataTable!: HaDataTable;

  private _showPaneController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width > 750,
  });

  public clearSelection() {
    this._dataTable.clearSelection();
  }

  protected firstUpdated() {
    if (this.initialGroupColumn) {
      this._groupColumn = this.initialGroupColumn;
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
      ? html`<ha-button-menu fixed>
          <ha-assist-chip
            .label=${localize("ui.components.subpage-data-table.sort_by", {
              sortColumn: this._sortColumn
                ? ` ${this.columns[this._sortColumn].title || this.columns[this._sortColumn].label}`
                : "",
            })}
            slot="trigger"
          >
            <ha-svg-icon slot="trailing-icon" .path=${mdiMenuDown}></ha-svg-icon
          ></ha-assist-chip>
          ${Object.entries(this.columns).map(([id, column]) =>
            column.sortable
              ? html`<ha-list-item
                  .value=${id}
                  @request-selected=${this._handleSortBy}
                  hasMeta
                  .activated=${id === this._sortColumn}
                >
                  ${this._sortColumn === id
                    ? html`<ha-svg-icon
                        slot="meta"
                        .path=${this._sortDirection === "desc"
                          ? mdiArrowDown
                          : mdiArrowUp}
                      ></ha-svg-icon>`
                    : nothing}
                  ${column.title || column.label}
                </ha-list-item>`
              : nothing
          )}
        </ha-button-menu>`
      : nothing;

    const groupByMenu = Object.values(this.columns).find((col) => col.groupable)
      ? html`<ha-button-menu fixed>
          <ha-assist-chip
            .label=${localize("ui.components.subpage-data-table.group_by", {
              groupColumn: this._groupColumn
                ? ` ${this.columns[this._groupColumn].title || this.columns[this._groupColumn].label}`
                : "",
            })}
            slot="trigger"
          >
            <ha-svg-icon slot="trailing-icon" .path=${mdiMenuDown}></ha-svg-icon
          ></ha-assist-chip>
          ${Object.entries(this.columns).map(([id, column]) =>
            column.groupable
              ? html`<ha-list-item
                  .value=${id}
                  @request-selected=${this._handleGroupBy}
                  .activated=${id === this._groupColumn}
                >
                  ${column.title || column.label}
                </ha-list-item> `
              : nothing
          )}
          <li divider role="separator"></li>
          <ha-list-item
            .value=${undefined}
            @request-selected=${this._handleGroupBy}
            .activated=${this._groupColumn === undefined}
            >${localize(
              "ui.components.subpage-data-table.dont_group_by"
            )}</ha-list-item
          >
        </ha-button-menu>`
      : nothing;

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
              <div class="center-vertical">
                <ha-icon-button
                  .path=${mdiClose}
                  @click=${this._disableSelectMode}
                ></ha-icon-button>
                <p>
                  ${localize("ui.components.subpage-data-table.selected", {
                    selected: this.selected || "0",
                  })}
                </p>
              </div>
              <div class="center-vertical">
                <slot name="selection-bar"></slot>
              </div>
            </div>`
          : nothing}
        ${this.showFilters
          ? !showPane
            ? html`<ha-dialog
                open
                hideActions
                .heading=${localize("ui.components.subpage-data-table.filters")}
              >
                <ha-dialog-header slot="heading">
                  <ha-icon-button
                    slot="navigationIcon"
                    .path=${mdiClose}
                    @click=${this._toggleFilters}
                  ></ha-icon-button>
                  <span slot="title"
                    >${localize(
                      "ui.components.subpage-data-table.filters"
                    )}</span
                  >
                  <ha-icon-button
                    slot="actionItems"
                    .path=${mdiFilterRemove}
                  ></ha-icon-button>
                </ha-dialog-header>
                <div class="filter-dialog-content">
                  <slot name="filter-pane"></slot></div
              ></ha-dialog>`
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
                  <ha-icon-button
                    .path=${mdiFilterRemove}
                    @click=${this._clearFilters}
                  ></ha-icon-button>
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
              >
                ${!this.narrow
                  ? html`
                      <div slot="header">
                        <slot name="header">
                          <div class="table-header">
                            ${this.hasFilters && !this.showFilters
                              ? html`${filterButton}`
                              : nothing}${selectModeBtn}${searchBar}${groupByMenu}${sortByMenu}
                          </div>
                        </slot>
                      </div>
                    `
                  : html`<div slot="header"></div>
                      <div slot="header-row" class="narrow-header-row">
                        ${this.hasFilters && !this.showFilters
                          ? html`${filterButton}`
                          : nothing}
                        ${selectModeBtn}${groupByMenu}${sortByMenu}
                      </div>`}
              </ha-data-table>`}
        <div slot="fab"><slot name="fab"></slot></div>
      </hass-tabs-subpage>
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
    ev.stopPropagation();
    const columnId = ev.currentTarget.value;
    if (!this._sortDirection || this._sortColumn !== columnId) {
      this._sortDirection = "asc";
    } else if (this._sortDirection === "asc") {
      this._sortDirection = "desc";
    } else {
      this._sortDirection = null;
    }
    this._sortColumn = this._sortDirection === null ? undefined : columnId;
  }

  private _handleGroupBy(ev) {
    this._groupColumn = ev.currentTarget.value;
  }

  private _enableSelectMode() {
    this._selectMode = true;
  }

  private _disableSelectMode() {
    this._selectMode = false;
  }

  private _handleSearchChange(ev: CustomEvent) {
    if (this.filter === ev.detail.value) {
      return;
    }
    this.filter = ev.detail.value;
    fireEvent(this, "search-changed", { value: this.filter });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }

      ha-data-table {
        width: 100%;
        height: 100%;
        --data-table-border-width: 0;
      }
      :host(:not([narrow])) ha-data-table,
      .pane {
        height: calc(100vh - 1px - var(--header-height));
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
        padding: 0 16px;
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
        font-size: 14px;
        width: max-content;
        cursor: initial;
        direction: var(--direction);
      }
      .active-filters ha-svg-icon {
        color: var(--primary-color);
      }
      .active-filters mwc-button {
        margin-left: 8px;
        margin-inline-start: 8px;
        margin-inline-end: initial;
        direction: var(--direction);
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
      .badge {
        min-width: 20px;
        box-sizing: border-box;
        border-radius: 50%;
        font-weight: 400;
        background-color: var(--primary-color);
        line-height: 20px;
        text-align: center;
        padding: 0px 4px;
        color: var(--text-primary-color);
        position: absolute;
        right: 0;
        inset-inline-end: 0;
        inset-inline-start: initial;
        top: 4px;
        font-size: 0.65em;
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
        min-width: 16px;
        box-sizing: border-box;
        border-radius: 50%;
        font-weight: 400;
        font-size: 11px;
        background-color: var(--accent-color);
        line-height: 16px;
        text-align: center;
        padding: 0px 2px;
        color: var(--text-accent-color, var(--text-primary-color));
      }

      .narrow-header-row {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 0 16px;
        overflow-x: scroll;
        -ms-overflow-style: none;
        scrollbar-width: none;
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
        font-size: 14px;
      }

      .center-vertical {
        display: flex;
        align-items: center;
      }

      .relative {
        position: relative;
      }

      .selection-bar p {
        margin-left: 16px;
      }

      ha-assist-chip {
        --ha-assist-chip-container-shape: 10px;
      }
      ha-button-menu {
        --mdc-list-item-meta-size: 16px;
        --mdc-list-item-meta-display: flex;
      }
      ha-button-menu ha-assist-chip {
        --md-assist-chip-trailing-space: 8px;
      }

      .select-mode-chip {
        --md-assist-chip-icon-label-space: 0;
      }

      ha-dialog {
        --mdc-dialog-min-width: calc(
          100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
        );
        --mdc-dialog-max-width: calc(
          100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
        );
        --mdc-dialog-min-height: 100%;
        --mdc-dialog-max-height: 100%;
        --vertical-align-dialog: flex-end;
        --ha-dialog-border-radius: 0;
        --dialog-content-padding: 0;
      }

      .filter-dialog-content {
        height: calc(100vh - 1px - var(--header-height));
        display: flex;
        flex-direction: column;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-tabs-subpage-data-table": HaTabsSubpageDataTable;
  }
}
