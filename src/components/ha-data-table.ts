import { repeat } from "lit-html/directives/repeat";

import {
  MDCDataTableAdapter,
  MDCDataTableFoundation,
} from "../../mdc-data-table/index"; // Because mdc-data-table published ts files, temporary load them from own repo, outside src so our linters won't complain

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

import memoizeOne from "memoize-one";

import "./ha-icon";
import "../common/search/search-input";
import "./ha-checkbox";
// tslint:disable-next-line
import { HaCheckbox } from "./ha-checkbox";
import { fireEvent } from "../common/dom/fire_event";

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

export interface DataTabelColumnContainer {
  [key: string]: DataTabelColumnData;
}

export interface DataTabelColumnData {
  title: string;
  type?: "numeric";
  sortable?: boolean;
  filterable?: boolean;
  filterKey?: string;
  direction?: SortingDirection;
  template?: (data: any) => TemplateResult;
}

export interface DataTabelRowData {
  [key: string]: any;
}

@customElement("ha-data-table")
export class HaDataTable extends BaseElement {
  @property({ type: Object }) public columns: DataTabelColumnContainer = {};
  @property({ type: Array }) public data: DataTabelRowData[] = [];
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

  private _filterSortData = memoizeOne(
    (
      data: DataTabelRowData[],
      columns: DataTabelColumnContainer,
      filter: string,
      direction: SortingDirection,
      sortColumn?: string
    ) =>
      sortColumn
        ? this._memSortData(
            this._memFilterData(data, columns, filter),
            columns,
            direction,
            sortColumn
          )
        : this._memFilterData(data, columns, filter)
  );

  private _memFilterData = memoizeOne(
    (
      data: DataTabelRowData[],
      columns: DataTabelColumnContainer,
      filter: string
    ) => {
      if (!filter) {
        return data;
      }
      const ucFilter = filter.toUpperCase();
      return data.filter((row) => {
        return Object.entries(columns).some((columnEntry) => {
          const [key, column] = columnEntry;
          if (column.filterable) {
            if (
              (column.filterKey ? row[key][column.filterKey] : row[key])
                .toUpperCase()
                .includes(ucFilter)
            ) {
              return true;
            }
          }
          return false;
        });
      });
    }
  );

  private _memSortData = memoizeOne(
    (
      data: DataTabelRowData[],
      columns: DataTabelColumnContainer,
      direction: SortingDirection,
      sortColumn: string
    ) => {
      const sorted = [...data];
      const column = columns[sortColumn];
      return sorted.sort((a, b) => {
        let sort = 1;
        if (direction === "desc") {
          sort = -1;
        }

        let valA = column.filterKey
          ? a[sortColumn][column.filterKey]
          : a[sortColumn];

        let valB = column.filterKey
          ? b[sortColumn][column.filterKey]
          : b[sortColumn];

        if (typeof valA === "string") {
          valA = valA.toUpperCase();
        }
        if (typeof valB === "string") {
          valB = valB.toUpperCase();
        }

        if (valA < valB) {
          return sort * -1;
        }
        if (valA > valB) {
          return sort * 1;
        }
        return 0;
      });
    }
  );

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
                  "mdc-data-table__cell--numeric": Boolean(
                    column.type && column.type === "numeric"
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
              this._filterSortData(
                this.data,
                this.columns,
                this._filter,
                this._sortDirection,
                this._sortColumn
              ),
              (row: DataTabelRowData) => row[this.id],
              (row: DataTabelRowData) => html`
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
                        })}"
                      >
                        ${column.template
                          ? column.template(row[key])
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
    this._filter = ev.detail.value;
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
        background-color: var(--card-background-color);
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
      .mdc-data-table__header-cell.not-sorted:not(.mdc-data-table__cell--numeric)
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
      .mdc-data-table__header-cell.not-sorted:not(.mdc-data-table__cell--numeric):hover
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
