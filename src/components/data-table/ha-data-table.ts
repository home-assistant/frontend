import { repeat } from "lit-html/directives/repeat";
import deepClone from "deep-clone-simple";

import {
  MDCDataTableAdapter,
  MDCDataTableFoundation,
} from "@material/data-table";

import {
  BaseElement,
  html,
  query,
  queryAll,
  CSSResult,
  css,
  customElement,
  property,
  classMap,
  TemplateResult,
  PropertyValues,
} from "@material/mwc-base/base-element";

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
  id: string;
  selected: boolean;
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
  template?: <T>(data: any, row: T) => TemplateResult;
}

export interface DataTableRowData {
  [key: string]: any;
}

@customElement("ha-data-table")
export class HaDataTable extends BaseElement {
  @property({ type: Object }) public columns: DataTableColumnContainer = {};
  @property({ type: Array }) public data: DataTableRowData[] = [];
  @property({ type: Boolean }) public selectable = false;
  @property({ type: String }) public id = "id";
  protected mdcFoundation!: MDCDataTableFoundation;
  protected readonly mdcFoundationClass = MDCDataTableFoundation;
  @query(".mdc-data-table") protected mdcRoot!: HTMLElement;
  @queryAll(".mdc-data-table__row") protected rowElements!: HTMLElement[];
  @query("#header-checkbox") private _headerCheckbox!: HaCheckbox;
  @property({ type: Boolean }) private _filterable = false;
  @property({ type: Boolean }) private _headerChecked = false;
  @property({ type: Boolean }) private _headerIndeterminate = false;
  @property({ type: Array }) private _checkedRows: string[] = [];
  @property({ type: String }) private _filter = "";
  @property({ type: String }) private _sortColumn?: string;
  @property({ type: String }) private _sortDirection: SortingDirection = null;
  @property({ type: Array }) private _filteredData: DataTableRowData[] = [];
  private _sortColumns: {
    [key: string]: DataTableSortColumnData;
  } = {};
  private curRequest = 0;
  private _worker: any | undefined;

  private _debounceSearch = debounce(
    (ev) => {
      this._filter = ev.detail.value;
    },
    200,
    false
  );

  protected firstUpdated() {
    super.firstUpdated();
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
      ${this._filterable
        ? html`
            <search-input
              @value-changed=${this._handleSearchChange}
            ></search-input>
          `
        : ""}
      <div class="mdc-data-table">
        <table class="mdc-data-table__table">
          <thead>
            <tr class="mdc-data-table__header-row">
              ${this.selectable
                ? html`
                    <th
                      class="mdc-data-table__header-cell mdc-data-table__header-cell--checkbox"
                      role="columnheader"
                      scope="col"
                    >
                      <ha-checkbox
                        id="header-checkbox"
                        class="mdc-data-table__row-checkbox"
                        @change=${this._handleHeaderRowCheckboxChange}
                        .indeterminate=${this._headerIndeterminate}
                        .checked=${this._headerChecked}
                      >
                      </ha-checkbox>
                    </th>
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
                };
                return html`
                  <th
                    class="mdc-data-table__header-cell ${classMap(classes)}"
                    role="columnheader"
                    scope="col"
                    @click=${this._handleHeaderClick}
                    data-column-id="${key}"
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
                  </th>
                `;
              })}
            </tr>
          </thead>
          <tbody class="mdc-data-table__content">
            ${repeat(
              this._filteredData!,
              (row: DataTableRowData) => row[this.id],
              (row: DataTableRowData) => html`
                <tr
                  data-row-id="${row[this.id]}"
                  @click=${this._handleRowClick}
                  class="mdc-data-table__row"
                >
                  ${this.selectable
                    ? html`
                        <td
                          class="mdc-data-table__cell mdc-data-table__cell--checkbox"
                        >
                          <ha-checkbox
                            class="mdc-data-table__row-checkbox"
                            @change=${this._handleRowCheckboxChange}
                            .checked=${this._checkedRows.includes(row[this.id])}
                          >
                          </ha-checkbox>
                        </td>
                      `
                    : ""}
                  ${Object.entries(this.columns).map((columnEntry) => {
                    const [key, column] = columnEntry;
                    return html`
                      <td
                        class="mdc-data-table__cell ${classMap({
                          "mdc-data-table__cell--numeric": Boolean(
                            column.type && column.type === "numeric"
                          ),
                          "mdc-data-table__cell--icon": Boolean(
                            column.type && column.type === "icon"
                          ),
                        })}"
                      >
                        ${column.template
                          ? column.template(row[key], row)
                          : row[key]}
                      </td>
                    `;
                  })}
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>
    `;
  }

  protected createAdapter(): MDCDataTableAdapter {
    return {
      addClassAtRowIndex: (rowIndex: number, cssClasses: string) => {
        this.rowElements[rowIndex].classList.add(cssClasses);
      },
      getRowCount: () => this.data.length,
      getRowElements: () => this.rowElements,
      getRowIdAtIndex: (rowIndex: number) => this._getRowIdAtIndex(rowIndex),
      getRowIndexByChildElement: (el: Element) =>
        Array.prototype.indexOf.call(this.rowElements, el.closest("tr")),
      getSelectedRowCount: () => this._checkedRows.length,
      isCheckboxAtRowIndexChecked: (rowIndex: number) =>
        this._checkedRows.includes(this._getRowIdAtIndex(rowIndex)),
      isHeaderRowCheckboxChecked: () => this._headerChecked,
      isRowsSelectable: () => true,
      notifyRowSelectionChanged: () => undefined,
      notifySelectedAll: () => undefined,
      notifyUnselectedAll: () => undefined,
      registerHeaderRowCheckbox: () => undefined,
      registerRowCheckboxes: () => undefined,
      removeClassAtRowIndex: (rowIndex: number, cssClasses: string) => {
        this.rowElements[rowIndex].classList.remove(cssClasses);
      },
      setAttributeAtRowIndex: (
        rowIndex: number,
        attr: string,
        value: string
      ) => {
        this.rowElements[rowIndex].setAttribute(attr, value);
      },
      setHeaderRowCheckboxChecked: (checked: boolean) => {
        this._headerChecked = checked;
      },
      setHeaderRowCheckboxIndeterminate: (indeterminate: boolean) => {
        this._headerIndeterminate = indeterminate;
      },
      setRowCheckboxCheckedAtIndex: (rowIndex: number, checked: boolean) => {
        this._setRowChecked(this._getRowIdAtIndex(rowIndex), checked);
      },
    };
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

  private _getRowIdAtIndex(rowIndex: number): string {
    return this.rowElements[rowIndex].getAttribute("data-row-id")!;
  }

  private _handleHeaderClick(ev: Event) {
    const columnId = (ev.target as HTMLElement)
      .closest("th")!
      .getAttribute("data-column-id")!;
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

  private _handleHeaderRowCheckboxChange() {
    this._headerChecked = this._headerCheckbox.checked;
    this._headerIndeterminate = this._headerCheckbox.indeterminate;
    this.mdcFoundation.handleHeaderRowCheckboxChange();
  }

  private _handleRowCheckboxChange(ev: Event) {
    const checkbox = ev.target as HaCheckbox;
    const rowId = checkbox.closest("tr")!.getAttribute("data-row-id");

    this._setRowChecked(rowId!, checkbox.checked);
    this.mdcFoundation.handleRowCheckboxChange(ev);
  }

  private _handleRowClick(ev: Event) {
    const rowId = (ev.target as HTMLElement)
      .closest("tr")!
      .getAttribute("data-row-id")!;
    fireEvent(this, "row-click", { id: rowId }, { bubbles: false });
  }

  private _setRowChecked(rowId: string, checked: boolean) {
    if (checked && !this._checkedRows.includes(rowId)) {
      this._checkedRows = [...this._checkedRows, rowId];
    } else if (!checked) {
      const index = this._checkedRows.indexOf(rowId);
      if (index !== -1) {
        this._checkedRows.splice(index, 1);
      }
    }
    fireEvent(this, "selection-changed", {
      id: rowId,
      selected: checked,
    });
  }

  private _handleSearchChange(ev: CustomEvent): void {
    this._debounceSearch(ev);
  }

  static get styles(): CSSResult {
    return css`
      /* default mdc styles, colors changed, without checkbox styles */

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
        overflow-x: auto;
      }

      .mdc-data-table__row--selected {
        background-color: rgba(var(--rgb-primary-color), 0.04);
      }

      .mdc-data-table__row {
        border-top-color: rgba(var(--rgb-primary-text-color), 0.12);
      }

      .mdc-data-table__row {
        border-top-width: 1px;
        border-top-style: solid;
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
      }

      .mdc-data-table__row {
        height: 52px;
      }

      .mdc-data-table__cell,
      .mdc-data-table__header-cell {
        padding-right: 16px;
        padding-left: 16px;
      }

      .mdc-data-table__header-cell--checkbox,
      .mdc-data-table__cell--checkbox {
        /* @noflip */
        padding-left: 16px;
        /* @noflip */
        padding-right: 0;
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
        width: 100%;
        border: 0;
        white-space: nowrap;
        border-collapse: collapse;
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
      [dir="rtl"] .mdc-data-table__header-cell--numeric,
      .mdc-data-table__header-cell--numeric[dir="rtl"] {
        /* @noflip */
        text-align: left;
      }

      .mdc-data-table__header-cell--icon {
        text-align: center;
      }

      /* custom from here */

      .mdc-data-table {
        display: block;
      }
      .mdc-data-table__header-cell {
        overflow: hidden;
      }
      .mdc-data-table__header-cell.sortable {
        cursor: pointer;
      }
      .mdc-data-table__header-cell.not-sorted:not(.mdc-data-table__header-cell--numeric):not(.mdc-data-table__header-cell--icon)
        span {
        position: relative;
        left: -24px;
      }
      .mdc-data-table__header-cell.not-sorted > * {
        transition: left 0.2s ease 0s;
      }
      .mdc-data-table__header-cell.not-sorted ha-icon {
        left: -36px;
      }
      .mdc-data-table__header-cell.not-sorted:not(.mdc-data-table__header-cell--numeric):not(.mdc-data-table__header-cell--icon):hover
        span {
        left: 0px;
      }
      .mdc-data-table__header-cell:hover.not-sorted ha-icon {
        left: 0px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-data-table": HaDataTable;
  }
}
