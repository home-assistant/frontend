import { repeat } from "lit-html/directives/repeat";

import {
  MDCDataTableAdapter,
  MDCDataTableFoundation,
} from "@material/data-table/index.js";

import {
  BaseElement,
  html,
  query,
  queryAll,
  CSSResult,
  css,
  customElement,
  property,
  unsafeCSS,
  classMap,
  TemplateResult,
} from "@material/mwc-base/base-element.js";

import memoizeOne from "memoize-one";

// @ts-ignore
import styles from "@material/data-table/dist/mdc.data-table.min.css";

import "./ha-icon";
import "./ha-checkbox";
import "../common/search/search-input";

// tslint:disable-next-line
import { HaCheckbox } from "./ha-checkbox";
import { fireEvent } from "../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "selection-changed": SelectionChangedEvent;
    "sorting-changed": SortingChangedEvent;
  }
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
  id: string;
  [key: string]: any;
}

@customElement("ha-data-table")
export class HaDataTable extends BaseElement {
  @property({ type: Object }) public columns: DataTabelColumnContainer = {};

  @property({ type: Array }) public data: DataTabelRowData[] = [];

  @property({ type: Boolean }) public selectable = false;

  protected mdcFoundation!: MDCDataTableFoundation;

  protected readonly mdcFoundationClass = MDCDataTableFoundation;

  @query(".mdc-data-table") protected mdcRoot!: HTMLElement;

  @queryAll(".mdc-data-table__row") protected rowElements!: HTMLElement[];

  @query("#header-checkbox") private _headerCheckbox!: HaCheckbox;

  @property({ type: Boolean }) private _headerChecked = false;

  @property({ type: Boolean }) private _headerIndeterminate = false;

  @property({ type: Array }) private _checkedRows: string[] = [];

  @property() private _filter = "";
  @property() private _sortColumn?: string;
  @property() private _sortDirection: SortingDirection = null;

  private _filterSortData = memoizeOne(
    (
      data: DataTabelRowData[],
      filter: string,
      direction: SortingDirection,
      sortColumn?: string
    ) =>
      sortColumn
        ? this._sortData(this._filterData(data, filter), sortColumn, direction)
        : this._filterData(data, filter)
  );

  protected render() {
    return html`
      <search-input @value-changed=${this._handleSearchChange}></search-input>
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
                const key = columnEntry[0];
                const column = columnEntry[1];
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
                    ${column.title}
                  </th>
                `;
              })}
            </tr>
          </thead>
          <tbody class="mdc-data-table__content">
            ${repeat(
              this._filterSortData(
                this.data,
                this._filter,
                this._sortDirection,
                this._sortColumn
              ),
              (row: DataTabelRowData) => row.id,
              (row: DataTabelRowData) => html`
                <tr data-row-id="${row.id}" class="mdc-data-table__row">
                  ${this.selectable
                    ? html`
                        <td
                          class="mdc-data-table__cell mdc-data-table__cell--checkbox"
                        >
                          <ha-checkbox
                            class="mdc-data-table__row-checkbox"
                            @change=${this._handleRowCheckboxChange}
                            .checked=${this._checkedRows.includes(row.id)}
                          >
                          </ha-checkbox>
                        </td>
                      `
                    : ""}
                  ${Object.entries(this.columns).map((columnEntry) => {
                    const key = columnEntry[0];
                    const column = columnEntry[1];
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
        Array.prototype.indexOf.call(
          this.rowElements,
          el.parentElement!.parentElement!
        ),
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
    const columnId = (ev.target as HTMLElement).getAttribute("data-column-id")!;
    if (!this._sortDirection) {
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
    const rowId = checkbox.parentElement!.parentElement!.getAttribute(
      "data-row-id"
    );

    this._setRowChecked(rowId!, checkbox.checked);
    this.mdcFoundation.handleRowCheckboxChange(ev);
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

  private _filterData(data: DataTabelRowData[], filter: string) {
    if (!filter) {
      return data;
    }
    const ucFilter = filter.toUpperCase();
    return data.filter((row) => {
      return Object.entries(this.columns).some((columnEntry) => {
        const key = columnEntry[0];
        const column = columnEntry[1];
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

  private _sortData(
    data: DataTabelRowData[],
    sortColumn: string,
    direction: SortingDirection
  ) {
    const sorted = [...data];
    const column = this.columns[sortColumn];
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

  static get styles(): CSSResult {
    return css`
      ${unsafeCSS(styles)}
      .mdc-data-table {
        display: block;
      }
      .mdc-data-table__header-cell {
        overflow: hidden;
      }
      .mdc-data-table__header-cell.sortable {
        cursor: pointer;
      }
      .mdc-data-table__header-cell.not-sorted:not(.mdc-data-table__cell--numeric) {
        padding-left: 0px;
        transition: padding-left 0.2s ease 0s;
      }
      .mdc-data-table__header-cell.not-sorted ha-icon {
        left: -36px;
        transition: left 0.2s ease 0s;
      }
      .mdc-data-table__header-cell.not-sorted:not(.mdc-data-table__cell--numeric):hover {
        padding-left: 16px;
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
