import deepClone from "deep-clone-simple";

import { classMap } from "lit-html/directives/class-map";

import { scroll } from "lit-virtualizer";

import {
  html,
  query,
  CSSResult,
  css,
  customElement,
  property,
  TemplateResult,
  PropertyValues,
  LitElement,
} from "lit-element";

// eslint-disable-next-line import/no-webpack-loader-syntax
// @ts-ignore
// tslint:disable-next-line: no-implicit-dependencies
import sortFilterWorker from "workerize-loader!./sort_filter_worker";

import "../ha-icon";
import "../../common/search/search-input";
import "../ha-checkbox";
// tslint:disable-next-line
import { HaCheckbox } from "../ha-checkbox";
import { fireEvent } from "../../common/dom/fire_event";
import { nextRender } from "../../common/util/render-status";
import { debounce } from "../../common/util/debounce";
import { styleMap } from "lit-html/directives/style-map";
import { ifDefined } from "lit-html/directives/if-defined";

declare global {
  // for fire event
  interface HASSDomEvents {
    "selection-changed": SelectionChangedEvent;
    "row-click": RowClickedEvent;
    "sorting-changed": SortingChangedEvent;
  }
}

export interface RowClickedEvent {
  id: string;
}

export interface SelectionChangedEvent {
  value: string[];
}

export interface SortingChangedEvent {
  column: string;
  direction: SortingDirection;
}

export type SortingDirection = "desc" | "asc" | null;

export interface DataTableColumnContainer {
  [key: string]: DataTableColumnData;
}

export interface DataTableSortColumnData {
  sortable?: boolean;
  filterable?: boolean;
  filterKey?: string;
  direction?: SortingDirection;
}

export interface DataTableColumnData extends DataTableSortColumnData {
  title: string;
  type?: "numeric" | "icon";
  template?: <T>(data: any, row: T) => TemplateResult | string;
  width?: string;
  grows?: boolean;
}

export interface DataTableRowData {
  [key: string]: any;
  selectable?: boolean;
}

@customElement("ha-data-table")
export class HaDataTable extends LitElement {
  @property({ type: Object }) public columns: DataTableColumnContainer = {};
  @property({ type: Array }) public data: DataTableRowData[] = [];
  @property({ type: Boolean }) public selectable = false;
  @property({ type: Boolean, attribute: "auto-height" })
  public autoHeight = false;
  @property({ type: String }) public id = "id";
  @property({ type: String }) public noDataText?: string;
  @property({ type: String }) public filter = "";
  @property({ type: Boolean }) private _filterable = false;
  @property({ type: String }) private _filter = "";
  @property({ type: String }) private _sortColumn?: string;
  @property({ type: String }) private _sortDirection: SortingDirection = null;
  @property({ type: Array }) private _filteredData: DataTableRowData[] = [];
  @query("slot[name='header']") private _header!: HTMLSlotElement;
  @query(".mdc-data-table__table") private _table!: HTMLDivElement;
  private _checkableRowsCount?: number;
  private _checkedRows: string[] = [];
  private _sortColumns: {
    [key: string]: DataTableSortColumnData;
  } = {};
  private curRequest = 0;
  private _worker: any | undefined;

  private _debounceSearch = debounce(
    (value: string) => {
      this._filter = value;
    },
    100,
    false
  );

  public clearSelection(): void {
    this._checkedRows = [];
    this._checkedRowsChanged();
  }

  protected firstUpdated(properties: PropertyValues) {
    super.firstUpdated(properties);
    this._worker = sortFilterWorker();
  }

  protected updated(properties: PropertyValues) {
    super.updated(properties);

    if (properties.has("columns")) {
      this._filterable = Object.values(this.columns).some(
        (column) => column.filterable
      );

      for (const columnId in this.columns) {
        if (this.columns[columnId].direction) {
          this._sortDirection = this.columns[columnId].direction!;
          this._sortColumn = columnId;
          break;
        }
      }

      const clonedColumns: DataTableColumnContainer = deepClone(this.columns);
      Object.values(clonedColumns).forEach((column: DataTableColumnData) => {
        delete column.title;
        delete column.type;
        delete column.template;
      });

      this._sortColumns = clonedColumns;
    }

    if (properties.has("filter")) {
      this._debounceSearch(this.filter);
    }

    if (properties.has("data")) {
      this._checkableRowsCount = this.data.filter(
        (row) => row.selectable !== false
      ).length;
    }

    if (
      properties.has("data") ||
      properties.has("columns") ||
      properties.has("_filter") ||
      properties.has("_sortColumn") ||
      properties.has("_sortDirection")
    ) {
      this._filterData();
    }
  }

  protected render() {
    return html`
      <div class="mdc-data-table">
        <slot name="header" @slotchange=${this._calcTableHeight}>
          ${this._filterable
            ? html`
                <div class="table-header">
                  <search-input
                    @value-changed=${this._handleSearchChange}
                  ></search-input>
                </div>
              `
            : ""}
        </slot>
        <div
          class="mdc-data-table__table ${classMap({
            "auto-height": this.autoHeight,
          })}"
          style=${styleMap({
            height: this.autoHeight
              ? `${(this._filteredData.length || 1) * 53 + 57}px`
              : `calc(100% - ${this._header?.clientHeight}px)`,
          })}
        >
          <div class="mdc-data-table__header-row">
            ${this.selectable
              ? html`
                  <div
                    class="mdc-data-table__header-cell mdc-data-table__header-cell--checkbox"
                    role="columnheader"
                    scope="col"
                  >
                    <ha-checkbox
                      class="mdc-data-table__row-checkbox"
                      @change=${this._handleHeaderRowCheckboxClick}
                      .indeterminate=${this._checkedRows.length &&
                        this._checkedRows.length !== this._checkableRowsCount}
                      .checked=${this._checkedRows.length ===
                        this._checkableRowsCount}
                    >
                    </ha-checkbox>
                  </div>
                `
              : ""}
            ${Object.entries(this.columns).map((columnEntry) => {
              const [key, column] = columnEntry;
              const sorted = key === this._sortColumn;
              const classes = {
                "mdc-data-table__header-cell--numeric": Boolean(
                  column.type && column.type === "numeric"
                ),
                "mdc-data-table__header-cell--icon": Boolean(
                  column.type && column.type === "icon"
                ),
                sortable: Boolean(column.sortable),
                "not-sorted": Boolean(column.sortable && !sorted),
                grows: Boolean(column.grows),
              };
              return html`
                <div
                  class="mdc-data-table__header-cell ${classMap(classes)}"
                  style=${column.width
                    ? styleMap({
                        [column.grows ? "minWidth" : "width"]: String(
                          column.width
                        ),
                      })
                    : ""}
                  role="columnheader"
                  scope="col"
                  @click=${this._handleHeaderClick}
                  .columnId=${key}
                >
                  ${column.sortable
                    ? html`
                        <ha-icon
                          .icon=${sorted && this._sortDirection === "desc"
                            ? "hass:arrow-down"
                            : "hass:arrow-up"}
                        ></ha-icon>
                      `
                    : ""}
                  <span>${column.title}</span>
                </div>
              `;
            })}
          </div>
          ${!this._filteredData.length
            ? html`
                <div class="mdc-data-table__content">
                  <div class="mdc-data-table__row">
                    <div class="mdc-data-table__cell grows center">
                      ${this.noDataText || "No data"}
                    </div>
                  </div>
                </div>
              `
            : html`
                <div class="mdc-data-table__content scroller">
                  ${scroll({
                    items: this._filteredData,
                    renderItem: (row: DataTableRowData) => html`
                      <div
                        .rowId="${row[this.id]}"
                        @click=${this._handleRowClick}
                        class="mdc-data-table__row ${classMap({
                          "mdc-data-table__row--selected": this._checkedRows.includes(
                            String(row[this.id])
                          ),
                        })}"
                        aria-selected=${ifDefined(
                          this._checkedRows.includes(String(row[this.id]))
                            ? true
                            : undefined
                        )}
                        .selectable=${row.selectable !== false}
                      >
                        ${this.selectable
                          ? html`
                              <div
                                class="mdc-data-table__cell mdc-data-table__cell--checkbox"
                              >
                                <ha-checkbox
                                  class="mdc-data-table__row-checkbox"
                                  @change=${this._handleRowCheckboxClick}
                                  .disabled=${row.selectable === false}
                                  .checked=${this._checkedRows.includes(
                                    String(row[this.id])
                                  )}
                                >
                                </ha-checkbox>
                              </div>
                            `
                          : ""}
                        ${Object.entries(this.columns).map((columnEntry) => {
                          const [key, column] = columnEntry;
                          return html`
                            <div
                              class="mdc-data-table__cell ${classMap({
                                "mdc-data-table__cell--numeric": Boolean(
                                  column.type && column.type === "numeric"
                                ),
                                "mdc-data-table__cell--icon": Boolean(
                                  column.type && column.type === "icon"
                                ),
                                grows: Boolean(column.grows),
                              })}"
                              style=${column.width
                                ? styleMap({
                                    [column.grows
                                      ? "minWidth"
                                      : "width"]: String(column.width),
                                  })
                                : ""}
                            >
                              ${column.template
                                ? column.template(row[key], row)
                                : row[key]}
                            </div>
                          `;
                        })}
                      </div>
                    `,
                  })}
                </div>
              `}
        </div>
      </div>
    `;
  }

  private async _filterData() {
    const startTime = new Date().getTime();
    this.curRequest++;
    const curRequest = this.curRequest;

    const filterProm = this._worker.filterSortData(
      this.data,
      this._sortColumns,
      this._filter,
      this._sortDirection,
      this._sortColumn
    );

    const [data] = await Promise.all([filterProm, nextRender]);

    const curTime = new Date().getTime();
    const elapsed = curTime - startTime;

    if (elapsed < 100) {
      await new Promise((resolve) => setTimeout(resolve, 100 - elapsed));
    }
    if (this.curRequest !== curRequest) {
      return;
    }
    this._filteredData = data;
  }

  private _handleHeaderClick(ev: Event) {
    const columnId = ((ev.target as HTMLElement).closest(
      ".mdc-data-table__header-cell"
    ) as any).columnId;
    if (!this.columns[columnId].sortable) {
      return;
    }
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

  private _handleHeaderRowCheckboxClick(ev: Event) {
    const checkbox = ev.target as HaCheckbox;
    if (checkbox.checked) {
      this._checkedRows = this._filteredData
        .filter((data) => data.selectable !== false)
        .map((data) => data[this.id]);
      this._checkedRowsChanged();
    } else {
      this._checkedRows = [];
      this._checkedRowsChanged();
    }
  }

  private _handleRowCheckboxClick(ev: Event) {
    const checkbox = ev.target as HaCheckbox;
    const rowId = (checkbox.closest(".mdc-data-table__row") as any).rowId;

    if (checkbox.checked) {
      if (this._checkedRows.includes(rowId)) {
        return;
      }
      this._checkedRows = [...this._checkedRows, rowId];
    } else {
      this._checkedRows = this._checkedRows.filter((row) => row !== rowId);
    }
    this._checkedRowsChanged();
  }

  private _handleRowClick(ev: Event) {
    const target = ev.target as HTMLElement;
    if (target.tagName === "HA-CHECKBOX") {
      return;
    }
    const rowId = (target.closest(".mdc-data-table__row") as any).rowId;
    fireEvent(this, "row-click", { id: rowId }, { bubbles: false });
  }

  private _checkedRowsChanged() {
    // force scroller to update, change it's items
    this._filteredData = [...this._filteredData];
    fireEvent(this, "selection-changed", {
      value: this._checkedRows,
    });
  }

  private _handleSearchChange(ev: CustomEvent): void {
    this._debounceSearch(ev.detail.value);
  }

  private async _calcTableHeight() {
    if (this.autoHeight) {
      return;
    }
    await this.updateComplete;
    this._table.style.height = `calc(100% - ${this._header.clientHeight}px)`;
  }

  static get styles(): CSSResult {
    return css`
      /* default mdc styles, colors changed, without checkbox styles */
      :host {
        height: 100%;
      }
      .mdc-data-table__content {
        font-family: Roboto, sans-serif;
        -moz-osx-font-smoothing: grayscale;
        -webkit-font-smoothing: antialiased;
        font-size: 0.875rem;
        line-height: 1.25rem;
        font-weight: 400;
        letter-spacing: 0.0178571429em;
        text-decoration: inherit;
        text-transform: inherit;
      }

      .mdc-data-table {
        background-color: var(--data-table-background-color);
        border-radius: 4px;
        border-width: 1px;
        border-style: solid;
        border-color: rgba(var(--rgb-primary-text-color), 0.12);
        display: inline-flex;
        flex-direction: column;
        box-sizing: border-box;
        overflow: hidden;
      }

      .mdc-data-table__row--selected {
        background-color: rgba(var(--rgb-primary-color), 0.04);
      }

      .mdc-data-table__row {
        display: flex;
        width: 100%;
        height: 52px;
      }

      .mdc-data-table__row ~ .mdc-data-table__row {
        border-top: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
      }

      .mdc-data-table__row:not(.mdc-data-table__row--selected):hover {
        background-color: rgba(var(--rgb-primary-text-color), 0.04);
      }

      .mdc-data-table__header-cell {
        color: var(--primary-text-color);
      }

      .mdc-data-table__cell {
        color: var(--primary-text-color);
      }

      .mdc-data-table__header-row {
        height: 56px;
        display: flex;
        width: 100%;
        border-bottom: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
        overflow-x: auto;
      }

      .mdc-data-table__header-row::-webkit-scrollbar {
        display: none;
      }

      .mdc-data-table__cell,
      .mdc-data-table__header-cell {
        padding-right: 16px;
        padding-left: 16px;
        align-self: center;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-shrink: 0;
      }

      .mdc-data-table__header-cell--checkbox,
      .mdc-data-table__cell--checkbox {
        /* @noflip */
        padding-left: 16px;
        /* @noflip */
        padding-right: 0;
        width: 40px;
      }
      [dir="rtl"] .mdc-data-table__header-cell--checkbox,
      .mdc-data-table__header-cell--checkbox[dir="rtl"],
      [dir="rtl"] .mdc-data-table__cell--checkbox,
      .mdc-data-table__cell--checkbox[dir="rtl"] {
        /* @noflip */
        padding-left: 0;
        /* @noflip */
        padding-right: 16px;
      }

      .mdc-data-table__table {
        height: 100%;
        width: 100%;
        border: 0;
        white-space: nowrap;
      }

      .mdc-data-table__cell {
        font-family: Roboto, sans-serif;
        -moz-osx-font-smoothing: grayscale;
        -webkit-font-smoothing: antialiased;
        font-size: 0.875rem;
        line-height: 1.25rem;
        font-weight: 400;
        letter-spacing: 0.0178571429em;
        text-decoration: inherit;
        text-transform: inherit;
      }

      .mdc-data-table__cell--numeric {
        text-align: right;
      }
      [dir="rtl"] .mdc-data-table__cell--numeric,
      .mdc-data-table__cell--numeric[dir="rtl"] {
        /* @noflip */
        text-align: left;
      }

      .mdc-data-table__cell--icon {
        color: var(--secondary-text-color);
        text-align: center;
      }

      .mdc-data-table__header-cell--icon,
      .mdc-data-table__cell--icon {
        width: 24px;
      }

      .mdc-data-table__header-cell.mdc-data-table__header-cell--icon {
        text-align: center;
      }
      .mdc-data-table__header-cell.sortable.mdc-data-table__header-cell--icon:hover,
      .mdc-data-table__header-cell.sortable.mdc-data-table__header-cell--icon:not(.not-sorted) {
        text-align: left;
      }

      .mdc-data-table__cell--icon:first-child ha-icon {
        margin-left: 8px;
      }

      .mdc-data-table__cell--icon:first-child state-badge {
        margin-right: -8px;
      }

      .mdc-data-table__header-cell {
        font-family: Roboto, sans-serif;
        -moz-osx-font-smoothing: grayscale;
        -webkit-font-smoothing: antialiased;
        font-size: 0.875rem;
        line-height: 1.375rem;
        font-weight: 500;
        letter-spacing: 0.0071428571em;
        text-decoration: inherit;
        text-transform: inherit;
        text-align: left;
      }
      [dir="rtl"] .mdc-data-table__header-cell,
      .mdc-data-table__header-cell[dir="rtl"] {
        /* @noflip */
        text-align: right;
      }

      .mdc-data-table__header-cell--numeric {
        text-align: right;
      }
      .mdc-data-table__header-cell--numeric.sortable:hover,
      .mdc-data-table__header-cell--numeric.sortable:not(.not-sorted) {
        text-align: left;
      }
      [dir="rtl"] .mdc-data-table__header-cell--numeric,
      .mdc-data-table__header-cell--numeric[dir="rtl"] {
        /* @noflip */
        text-align: left;
      }

      /* custom from here */

      :host {
        display: block;
      }

      .mdc-data-table {
        display: block;
        border-width: var(--data-table-border-width, 1px);
        height: 100%;
      }
      .mdc-data-table__header-cell {
        overflow: hidden;
        position: relative;
      }
      .mdc-data-table__header-cell span {
        position: relative;
        left: 0px;
      }

      .mdc-data-table__header-cell.sortable {
        cursor: pointer;
      }
      .mdc-data-table__header-cell > * {
        transition: left 0.2s ease;
      }
      .mdc-data-table__header-cell ha-icon {
        top: -3px;
        position: absolute;
      }
      .mdc-data-table__header-cell.not-sorted ha-icon {
        left: -20px;
      }
      .mdc-data-table__header-cell.sortable:not(.not-sorted) span,
      .mdc-data-table__header-cell.sortable.not-sorted:hover span {
        left: 24px;
      }
      .mdc-data-table__header-cell.sortable:not(.not-sorted) ha-icon,
      .mdc-data-table__header-cell.sortable:hover.not-sorted ha-icon {
        left: 12px;
      }
      .table-header {
        border-bottom: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
      }
      search-input {
        position: relative;
        top: 2px;
      }
      slot[name="header"] {
        display: block;
      }
      .center {
        text-align: center;
      }
      .scroller {
        display: flex;
        position: relative;
        contain: strict;
        height: calc(100% - 57px);
      }
      .mdc-data-table__table:not(.auto-height) .scroller {
        overflow: auto;
      }
      .grows {
        flex-grow: 1;
        flex-shrink: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-data-table": HaDataTable;
  }
}
