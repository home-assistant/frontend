import { mdiArrowDown, mdiArrowUp, mdiChevronUp } from "@mdi/js";
import deepClone from "deep-clone-simple";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { restoreScroll } from "../../common/decorators/restore-scroll";
import { fireEvent } from "../../common/dom/fire_event";
import { stringCompare } from "../../common/string/compare";
import { debounce } from "../../common/util/debounce";
import { groupBy } from "../../common/util/group-by";
import { nextRender } from "../../common/util/render-status";
import { haStyleScrollbar } from "../../resources/styles";
import { loadVirtualizer } from "../../resources/virtualizer";
import { HomeAssistant } from "../../types";
import "../ha-checkbox";
import type { HaCheckbox } from "../ha-checkbox";
import "../ha-svg-icon";
import "../search-input";
import { filterData, sortData } from "./sort-filter";
import { LocalizeFunc } from "../../common/translations/localize";

export interface RowClickedEvent {
  id: string;
}

export interface SelectionChangedEvent {
  value: string[];
}

export interface CollapsedChangedEvent {
  value: string[];
}

export interface SortingChangedEvent {
  column: string;
  direction: SortingDirection;
}

export type SortingDirection = "desc" | "asc" | null;

export interface DataTableColumnContainer<T = any> {
  [key: string]: DataTableColumnData<T>;
}

export interface DataTableSortColumnData {
  sortable?: boolean;
  filterable?: boolean;
  filterKey?: string;
  valueColumn?: string;
  direction?: SortingDirection;
  groupable?: boolean;
  moveable?: boolean;
  hideable?: boolean;
  defaultHidden?: boolean;
  showNarrow?: boolean;
}

export interface DataTableColumnData<T = any> extends DataTableSortColumnData {
  main?: boolean;
  title: TemplateResult | string;
  label?: TemplateResult | string;
  type?:
    | "numeric"
    | "icon"
    | "icon-button"
    | "overflow"
    | "overflow-menu"
    | "flex";
  template?: (row: T) => TemplateResult | string | typeof nothing;
  extraTemplate?: (row: T) => TemplateResult | string | typeof nothing;
  width?: string;
  maxWidth?: string;
  grows?: boolean;
  forceLTR?: boolean;
  hidden?: boolean;
}

export type ClonedDataTableColumnData = Omit<DataTableColumnData, "title"> & {
  title?: TemplateResult | string;
};

export interface DataTableRowData {
  [key: string]: any;
  selectable?: boolean;
}

export interface SortableColumnContainer {
  [key: string]: ClonedDataTableColumnData;
}

const UNDEFINED_GROUP_KEY = "zzzzz_undefined";

@customElement("ha-data-table")
export class HaDataTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public localizeFunc?: LocalizeFunc;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Object }) public columns: DataTableColumnContainer = {};

  @property({ type: Array }) public data: DataTableRowData[] = [];

  @property({ type: Boolean }) public selectable = false;

  @property({ type: Boolean }) public clickable = false;

  @property({ type: Boolean }) public hasFab = false;

  /**
   * Add an extra row at the bottom of the data table
   * @type {TemplateResult}
   */
  @property({ attribute: false }) public appendRow?;

  @property({ type: Boolean, attribute: "auto-height" })
  public autoHeight = false;

  @property({ type: String }) public id = "id";

  @property({ type: String }) public noDataText?: string;

  @property({ type: String }) public searchLabel?: string;

  @property({ type: Boolean, attribute: "no-label-float" })
  public noLabelFloat? = false;

  @property({ type: String }) public filter = "";

  @property() public groupColumn?: string;

  @property({ attribute: false }) public groupOrder?: string[];

  @property() public sortColumn?: string;

  @property() public sortDirection: SortingDirection = null;

  @property({ attribute: false }) public initialCollapsedGroups?: string[];

  @property({ attribute: false }) public hiddenColumns?: string[];

  @property({ attribute: false }) public columnOrder?: string[];

  @state() private _filterable = false;

  @state() private _filter = "";

  @state() private _filteredData: DataTableRowData[] = [];

  @state() private _headerHeight = 0;

  @query("slot[name='header']") private _header!: HTMLSlotElement;

  @state() private _items: DataTableRowData[] = [];

  @state() private _collapsedGroups: string[] = [];

  private _checkableRowsCount?: number;

  private _checkedRows: string[] = [];

  private _sortColumns: SortableColumnContainer = {};

  private curRequest = 0;

  // @ts-ignore
  @restoreScroll(".scroller") private _savedScrollPos?: number;

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

  public selectAll(): void {
    this._checkedRows = this._filteredData
      .filter((data) => data.selectable !== false)
      .map((data) => data[this.id]);
    this._checkedRowsChanged();
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this._items.length) {
      // Force update of location of rows
      this._items = [...this._items];
    }
  }

  protected firstUpdated() {
    this.updateComplete.then(() => this._calcTableHeight());
  }

  public willUpdate(properties: PropertyValues) {
    super.willUpdate(properties);

    if (!this.hasUpdated) {
      loadVirtualizer();
    }

    if (properties.has("columns")) {
      this._filterable = Object.values(this.columns).some(
        (column) => column.filterable
      );

      if (!this.sortColumn) {
        for (const columnId in this.columns) {
          if (this.columns[columnId].direction) {
            this.sortDirection = this.columns[columnId].direction!;
            this.sortColumn = columnId;

            fireEvent(this, "sorting-changed", {
              column: columnId,
              direction: this.sortDirection,
            });

            break;
          }
        }
      }

      const clonedColumns: DataTableColumnContainer = deepClone(this.columns);
      Object.values(clonedColumns).forEach(
        (column: ClonedDataTableColumnData) => {
          delete column.title;
          delete column.template;
          delete column.extraTemplate;
        }
      );

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

    if (!this.hasUpdated && this.initialCollapsedGroups) {
      this._collapsedGroups = this.initialCollapsedGroups;
      fireEvent(this, "collapsed-changed", { value: this._collapsedGroups });
    } else if (properties.has("groupColumn")) {
      this._collapsedGroups = [];
      fireEvent(this, "collapsed-changed", { value: this._collapsedGroups });
    }

    if (
      properties.has("data") ||
      properties.has("columns") ||
      properties.has("_filter") ||
      properties.has("sortColumn") ||
      properties.has("sortDirection") ||
      properties.has("groupColumn") ||
      properties.has("groupOrder") ||
      properties.has("_collapsedGroups")
    ) {
      this._sortFilterData();
    }

    if (properties.has("selectable") || properties.has("hiddenColumns")) {
      this._items = [...this._items];
    }
  }

  private _sortedColumns = memoizeOne(
    (columns: DataTableColumnContainer, columnOrder?: string[]) => {
      if (!columnOrder || !columnOrder.length) {
        return columns;
      }

      return Object.keys(columns)
        .sort((a, b) => {
          const orderA = columnOrder!.indexOf(a);
          const orderB = columnOrder!.indexOf(b);
          if (orderA !== orderB) {
            if (orderA === -1) {
              return 1;
            }
            if (orderB === -1) {
              return -1;
            }
          }
          return orderA - orderB;
        })
        .reduce((obj, key) => {
          obj[key] = columns[key];
          return obj;
        }, {}) as DataTableColumnContainer;
    }
  );

  protected render() {
    const localize = this.localizeFunc || this.hass.localize;

    const columns = this._sortedColumns(this.columns, this.columnOrder);

    const renderRow = (row: DataTableRowData, index: number) =>
      this._renderRow(columns, this.narrow, row, index);

    return html`
      <div class="mdc-data-table">
        <slot name="header" @slotchange=${this._calcTableHeight}>
          ${this._filterable
            ? html`
                <div class="table-header">
                  <search-input
                    .hass=${this.hass}
                    @value-changed=${this._handleSearchChange}
                    .label=${this.searchLabel}
                    .noLabelFloat=${this.noLabelFloat}
                  ></search-input>
                </div>
              `
            : ""}
        </slot>
        <div
          class="mdc-data-table__table ${classMap({
            "auto-height": this.autoHeight,
          })}"
          role="table"
          aria-rowcount=${this._filteredData.length + 1}
          style=${styleMap({
            height: this.autoHeight
              ? `${(this._filteredData.length || 1) * 53 + 53}px`
              : `calc(100% - ${this._headerHeight}px)`,
          })}
        >
          <div class="mdc-data-table__header-row" role="row" aria-rowindex="1">
            <slot name="header-row">
              ${this.selectable
                ? html`
                    <div
                      class="mdc-data-table__header-cell mdc-data-table__header-cell--checkbox"
                      role="columnheader"
                    >
                      <ha-checkbox
                        class="mdc-data-table__row-checkbox"
                        @change=${this._handleHeaderRowCheckboxClick}
                        .indeterminate=${this._checkedRows.length &&
                        this._checkedRows.length !== this._checkableRowsCount}
                        .checked=${this._checkedRows.length &&
                        this._checkedRows.length === this._checkableRowsCount}
                      >
                      </ha-checkbox>
                    </div>
                  `
                : ""}
              ${Object.entries(columns).map(([key, column]) => {
                if (
                  column.hidden ||
                  (this.columnOrder && this.columnOrder.includes(key)
                    ? (this.hiddenColumns?.includes(key) ??
                      column.defaultHidden)
                    : column.defaultHidden)
                ) {
                  return nothing;
                }
                const sorted = key === this.sortColumn;
                const classes = {
                  "mdc-data-table__header-cell--numeric":
                    column.type === "numeric",
                  "mdc-data-table__header-cell--icon": column.type === "icon",
                  "mdc-data-table__header-cell--icon-button":
                    column.type === "icon-button",
                  "mdc-data-table__header-cell--overflow-menu":
                    column.type === "overflow-menu",
                  "mdc-data-table__header-cell--overflow":
                    column.type === "overflow",
                  sortable: Boolean(column.sortable),
                  "not-sorted": Boolean(column.sortable && !sorted),
                  grows: Boolean(column.grows),
                };
                return html`
                  <div
                    aria-label=${ifDefined(column.label)}
                    class="mdc-data-table__header-cell ${classMap(classes)}"
                    style=${column.width
                      ? styleMap({
                          [column.grows ? "minWidth" : "width"]: column.width,
                          maxWidth: column.maxWidth || "",
                        })
                      : ""}
                    role="columnheader"
                    aria-sort=${ifDefined(
                      sorted
                        ? this.sortDirection === "desc"
                          ? "descending"
                          : "ascending"
                        : undefined
                    )}
                    @click=${this._handleHeaderClick}
                    .columnId=${key}
                  >
                    ${column.sortable
                      ? html`
                          <ha-svg-icon
                            .path=${sorted && this.sortDirection === "desc"
                              ? mdiArrowDown
                              : mdiArrowUp}
                          ></ha-svg-icon>
                        `
                      : ""}
                    <span>${column.title}</span>
                  </div>
                `;
              })}
            </slot>
          </div>
          ${!this._filteredData.length
            ? html`
                <div class="mdc-data-table__content">
                  <div class="mdc-data-table__row" role="row">
                    <div class="mdc-data-table__cell grows center" role="cell">
                      ${this.noDataText ||
                      localize("ui.components.data-table.no-data")}
                    </div>
                  </div>
                </div>
              `
            : html`
                <lit-virtualizer
                  scroller
                  class="mdc-data-table__content scroller ha-scrollbar"
                  @scroll=${this._saveScrollPos}
                  .items=${this._items}
                  .keyFunction=${this._keyFunction}
                  .renderItem=${renderRow}
                ></lit-virtualizer>
              `}
        </div>
      </div>
    `;
  }

  private _keyFunction = (row: DataTableRowData) => row?.[this.id] || row;

  private _renderRow = (
    columns: DataTableColumnContainer,
    narrow: boolean,
    row: DataTableRowData,
    index: number
  ) => {
    // not sure how this happens...
    if (!row) {
      return nothing;
    }
    if (row.append) {
      return html`<div class="mdc-data-table__row">${row.content}</div>`;
    }
    if (row.empty) {
      return html`<div class="mdc-data-table__row"></div>`;
    }
    return html`
      <div
        aria-rowindex=${index + 2}
        role="row"
        .rowId=${row[this.id]}
        @click=${this._handleRowClick}
        class="mdc-data-table__row ${classMap({
          "mdc-data-table__row--selected": this._checkedRows.includes(
            String(row[this.id])
          ),
          clickable: this.clickable,
        })}"
        aria-selected=${ifDefined(
          this._checkedRows.includes(String(row[this.id])) ? true : undefined
        )}
        .selectable=${row.selectable !== false}
      >
        ${this.selectable
          ? html`
              <div
                class="mdc-data-table__cell mdc-data-table__cell--checkbox"
                role="cell"
              >
                <ha-checkbox
                  class="mdc-data-table__row-checkbox"
                  @change=${this._handleRowCheckboxClick}
                  .rowId=${row[this.id]}
                  .disabled=${row.selectable === false}
                  .checked=${this._checkedRows.includes(String(row[this.id]))}
                >
                </ha-checkbox>
              </div>
            `
          : ""}
        ${Object.entries(columns).map(([key, column]) => {
          if (
            (narrow && !column.main && !column.showNarrow) ||
            column.hidden ||
            (this.columnOrder && this.columnOrder.includes(key)
              ? (this.hiddenColumns?.includes(key) ?? column.defaultHidden)
              : column.defaultHidden)
          ) {
            return nothing;
          }
          return html`
            <div
              @mouseover=${this._setTitle}
              @focus=${this._setTitle}
              role=${column.main ? "rowheader" : "cell"}
              class="mdc-data-table__cell ${classMap({
                "mdc-data-table__cell--flex": column.type === "flex",
                "mdc-data-table__cell--numeric": column.type === "numeric",
                "mdc-data-table__cell--icon": column.type === "icon",
                "mdc-data-table__cell--icon-button":
                  column.type === "icon-button",
                "mdc-data-table__cell--overflow-menu":
                  column.type === "overflow-menu",
                "mdc-data-table__cell--overflow": column.type === "overflow",
                grows: Boolean(column.grows),
                forceLTR: Boolean(column.forceLTR),
              })}"
              style=${column.width
                ? styleMap({
                    [column.grows ? "minWidth" : "width"]: column.width,
                    maxWidth: column.maxWidth ? column.maxWidth : "",
                  })
                : ""}
            >
              ${column.template
                ? column.template(row)
                : narrow && column.main
                  ? html`<div class="primary">${row[key]}</div>
                      <div class="secondary">
                        ${Object.entries(columns)
                          .filter(
                            ([key2, column2]) =>
                              !column2.hidden &&
                              !column2.main &&
                              !column2.showNarrow &&
                              !(this.columnOrder &&
                              this.columnOrder.includes(key2)
                                ? (this.hiddenColumns?.includes(key2) ??
                                  column2.defaultHidden)
                                : column2.defaultHidden)
                          )
                          .map(
                            ([key2, column2], i) =>
                              html`${i !== 0
                                ? " ⸱ "
                                : nothing}${column2.template
                                ? column2.template(row)
                                : row[key2]}`
                          )}
                      </div>
                      ${column.extraTemplate
                        ? column.extraTemplate(row)
                        : nothing}`
                  : html`${row[key]}${column.extraTemplate
                      ? column.extraTemplate(row)
                      : nothing}`}
            </div>
          `;
        })}
      </div>
    `;
  };

  private async _sortFilterData() {
    const startTime = new Date().getTime();
    this.curRequest++;
    const curRequest = this.curRequest;

    let filteredData = this.data;
    if (this._filter) {
      filteredData = await this._memFilterData(
        this.data,
        this._sortColumns,
        this._filter
      );
    }

    const prom = this.sortColumn
      ? sortData(
          filteredData,
          this._sortColumns[this.sortColumn],
          this.sortDirection,
          this.sortColumn,
          this.hass.locale.language
        )
      : filteredData;

    const [data] = await Promise.all([prom, nextRender]);

    const curTime = new Date().getTime();
    const elapsed = curTime - startTime;

    if (elapsed < 100) {
      await new Promise((resolve) => {
        setTimeout(resolve, 100 - elapsed);
      });
    }
    if (this.curRequest !== curRequest) {
      return;
    }

    const localize = this.localizeFunc || this.hass.localize;

    if (this.appendRow || this.hasFab || this.groupColumn) {
      let items = [...data];

      if (this.groupColumn) {
        const grouped = groupBy(items, (item) => item[this.groupColumn!]);
        if (grouped.undefined) {
          // make sure ungrouped items are at the bottom
          grouped[UNDEFINED_GROUP_KEY] = grouped.undefined;
          delete grouped.undefined;
        }
        const sorted: {
          [key: string]: DataTableRowData[];
        } = Object.keys(grouped)
          .sort((a, b) => {
            const orderA = this.groupOrder?.indexOf(a) ?? -1;
            const orderB = this.groupOrder?.indexOf(b) ?? -1;
            if (orderA !== orderB) {
              if (orderA === -1) {
                return 1;
              }
              if (orderB === -1) {
                return -1;
              }
              return orderA - orderB;
            }
            return stringCompare(
              ["", "-", "—"].includes(a) ? "zzz" : a,
              ["", "-", "—"].includes(b) ? "zzz" : b,
              this.hass.locale.language
            );
          })
          .reduce((obj, key) => {
            obj[key] = grouped[key];
            return obj;
          }, {});
        const groupedItems: DataTableRowData[] = [];
        Object.entries(sorted).forEach(([groupName, rows]) => {
          groupedItems.push({
            append: true,
            content: html`<div
              class="mdc-data-table__cell group-header"
              role="cell"
              .group=${groupName}
              @click=${this._collapseGroup}
            >
              <ha-icon-button
                .path=${mdiChevronUp}
                class=${this._collapsedGroups.includes(groupName)
                  ? "collapsed"
                  : ""}
              >
              </ha-icon-button>
              ${groupName === UNDEFINED_GROUP_KEY
                ? localize("ui.components.data-table.ungrouped")
                : groupName || ""}
            </div>`,
          });
          if (!this._collapsedGroups.includes(groupName)) {
            groupedItems.push(...rows);
          }
        });
        items = groupedItems;
      }

      if (this.appendRow) {
        items.push({ append: true, content: this.appendRow });
      }

      if (this.hasFab) {
        items.push({ empty: true });
      }

      this._items = items;
    } else {
      this._items = data;
    }
    this._filteredData = data;
  }

  private _memFilterData = memoizeOne(
    (
      data: DataTableRowData[],
      columns: SortableColumnContainer,
      filter: string
    ): Promise<DataTableRowData[]> => filterData(data, columns, filter)
  );

  private _handleHeaderClick(ev: Event) {
    const columnId = (ev.currentTarget as any).columnId;
    if (!this.columns[columnId].sortable) {
      return;
    }
    if (!this.sortDirection || this.sortColumn !== columnId) {
      this.sortDirection = "asc";
    } else if (this.sortDirection === "asc") {
      this.sortDirection = "desc";
    } else {
      this.sortDirection = null;
    }

    this.sortColumn = this.sortDirection === null ? undefined : columnId;

    fireEvent(this, "sorting-changed", {
      column: columnId,
      direction: this.sortDirection,
    });
  }

  private _handleHeaderRowCheckboxClick(ev: Event) {
    const checkbox = ev.target as HaCheckbox;
    if (checkbox.checked) {
      this.selectAll();
    } else {
      this._checkedRows = [];
      this._checkedRowsChanged();
    }
  }

  private _handleRowCheckboxClick = (ev: Event) => {
    const checkbox = ev.currentTarget as HaCheckbox;
    const rowId = (checkbox as any).rowId;

    if (checkbox.checked) {
      if (this._checkedRows.includes(rowId)) {
        return;
      }
      this._checkedRows = [...this._checkedRows, rowId];
    } else {
      this._checkedRows = this._checkedRows.filter((row) => row !== rowId);
    }
    this._checkedRowsChanged();
  };

  private _handleRowClick = (ev: Event) => {
    if (
      ev
        .composedPath()
        .find((el) =>
          [
            "ha-checkbox",
            "mwc-button",
            "ha-button",
            "ha-icon-button",
            "ha-assist-chip",
          ].includes((el as HTMLElement).localName)
        )
    ) {
      return;
    }
    const rowId = (ev.currentTarget as any).rowId;
    fireEvent(this, "row-click", { id: rowId }, { bubbles: false });
  };

  private _setTitle(ev: Event) {
    const target = ev.currentTarget as HTMLElement;
    if (target.scrollWidth > target.offsetWidth) {
      target.setAttribute("title", target.innerText);
    }
  }

  private _checkedRowsChanged() {
    // force scroller to update, change it's items
    if (this._items.length) {
      this._items = [...this._items];
    }
    fireEvent(this, "selection-changed", {
      value: this._checkedRows,
    });
  }

  private _handleSearchChange(ev: CustomEvent): void {
    if (this.filter) {
      return;
    }
    this._debounceSearch(ev.detail.value);
  }

  private async _calcTableHeight() {
    if (this.autoHeight) {
      return;
    }
    await this.updateComplete;
    this._headerHeight = this._header.clientHeight;
  }

  @eventOptions({ passive: true })
  private _saveScrollPos(e: Event) {
    this._savedScrollPos = (e.target as HTMLDivElement).scrollTop;
  }

  private _collapseGroup = (ev: Event) => {
    const groupName = (ev.currentTarget as any).group;
    if (this._collapsedGroups.includes(groupName)) {
      this._collapsedGroups = this._collapsedGroups.filter(
        (grp) => grp !== groupName
      );
    } else {
      this._collapsedGroups = [...this._collapsedGroups, groupName];
    }
    fireEvent(this, "collapsed-changed", { value: this._collapsedGroups });
  };

  public expandAllGroups() {
    this._collapsedGroups = [];
    fireEvent(this, "collapsed-changed", { value: this._collapsedGroups });
  }

  public collapseAllGroups() {
    if (
      !this.groupColumn ||
      !this.data.some((item) => item[this.groupColumn!])
    ) {
      return;
    }
    const grouped = groupBy(this.data, (item) => item[this.groupColumn!]);
    if (grouped.undefined) {
      // undefined is a reserved group name
      grouped[UNDEFINED_GROUP_KEY] = grouped.undefined;
      delete grouped.undefined;
    }
    this._collapsedGroups = Object.keys(grouped);
    fireEvent(this, "collapsed-changed", { value: this._collapsedGroups });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
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
          border-color: var(--divider-color);
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
          height: var(--data-table-row-height, 52px);
        }

        .mdc-data-table__row ~ .mdc-data-table__row {
          border-top: 1px solid var(--divider-color);
        }

        .mdc-data-table__row.clickable:not(
            .mdc-data-table__row--selected
          ):hover {
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
          border-bottom: 1px solid var(--divider-color);
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
          box-sizing: border-box;
        }

        .mdc-data-table__cell.mdc-data-table__cell--flex {
          display: flex;
          overflow: initial;
        }

        .mdc-data-table__cell.mdc-data-table__cell--icon {
          overflow: initial;
        }

        .mdc-data-table__header-cell--checkbox,
        .mdc-data-table__cell--checkbox {
          /* @noflip */
          padding-left: 16px;
          /* @noflip */
          padding-right: 0;
          /* @noflip */
          padding-inline-start: 16px;
          /* @noflip */
          padding-inline-end: initial;
          width: 60px;
        }

        .mdc-data-table__table {
          height: 100%;
          width: 100%;
          border: 0;
          white-space: nowrap;
          position: relative;
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

        .mdc-data-table__cell a {
          color: inherit;
          text-decoration: none;
        }

        .mdc-data-table__cell--numeric {
          text-align: var(--float-end);
        }

        .mdc-data-table__cell--icon {
          color: var(--secondary-text-color);
          text-align: center;
        }

        .mdc-data-table__header-cell--icon,
        .mdc-data-table__cell--icon {
          width: 54px;
        }

        .mdc-data-table__cell--icon img {
          width: 24px;
          height: 24px;
        }

        .mdc-data-table__header-cell.mdc-data-table__header-cell--icon {
          text-align: center;
        }

        .mdc-data-table__header-cell.sortable.mdc-data-table__header-cell--icon:hover,
        .mdc-data-table__header-cell.sortable.mdc-data-table__header-cell--icon:not(
            .not-sorted
          ) {
          text-align: var(--float-start);
        }

        .mdc-data-table__cell--icon:first-child img,
        .mdc-data-table__cell--icon:first-child ha-icon,
        .mdc-data-table__cell--icon:first-child ha-svg-icon,
        .mdc-data-table__cell--icon:first-child ha-state-icon,
        .mdc-data-table__cell--icon:first-child ha-domain-icon,
        .mdc-data-table__cell--icon:first-child ha-service-icon {
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
        }

        .mdc-data-table__cell--icon:first-child state-badge {
          margin-right: -8px;
          margin-inline-end: -8px;
          margin-inline-start: initial;
        }

        .mdc-data-table__cell--overflow-menu,
        .mdc-data-table__header-cell--overflow-menu,
        .mdc-data-table__header-cell--icon-button,
        .mdc-data-table__cell--icon-button {
          padding: 8px;
        }

        .mdc-data-table__header-cell--icon-button,
        .mdc-data-table__cell--icon-button {
          width: 56px;
        }

        .mdc-data-table__cell--overflow-menu,
        .mdc-data-table__cell--icon-button {
          color: var(--secondary-text-color);
          text-overflow: clip;
        }

        .mdc-data-table__header-cell--icon-button:first-child,
        .mdc-data-table__cell--icon-button:first-child,
        .mdc-data-table__header-cell--icon-button:last-child,
        .mdc-data-table__cell--icon-button:last-child {
          width: 64px;
        }

        .mdc-data-table__cell--overflow-menu:first-child,
        .mdc-data-table__header-cell--overflow-menu:first-child,
        .mdc-data-table__header-cell--icon-button:first-child,
        .mdc-data-table__cell--icon-button:first-child {
          padding-left: 16px;
          padding-inline-start: 16px;
          padding-inline-end: initial;
        }

        .mdc-data-table__cell--overflow-menu:last-child,
        .mdc-data-table__header-cell--overflow-menu:last-child,
        .mdc-data-table__header-cell--icon-button:last-child,
        .mdc-data-table__cell--icon-button:last-child {
          padding-right: 16px;
          padding-inline-end: 16px;
          padding-inline-start: initial;
        }
        .mdc-data-table__cell--overflow-menu,
        .mdc-data-table__cell--overflow,
        .mdc-data-table__header-cell--overflow-menu,
        .mdc-data-table__header-cell--overflow {
          overflow: initial;
        }
        .mdc-data-table__cell--icon-button a {
          color: var(--secondary-text-color);
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
          text-align: var(--float-start);
        }

        .mdc-data-table__header-cell--numeric {
          text-align: var(--float-end);
        }
        .mdc-data-table__header-cell--numeric.sortable:hover,
        .mdc-data-table__header-cell--numeric.sortable:not(.not-sorted) {
          text-align: var(--float-start);
        }

        /* custom from here */

        .group-header {
          padding-top: 12px;
          padding-left: 12px;
          padding-inline-start: 12px;
          padding-inline-end: initial;
          width: 100%;
          font-weight: 500;
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .group-header ha-icon-button {
          transition: transform 0.2s ease;
        }

        .group-header ha-icon-button.collapsed {
          transform: rotate(180deg);
        }

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
          inset-inline-start: 0px;
          inset-inline-end: initial;
        }

        .mdc-data-table__header-cell.sortable {
          cursor: pointer;
        }
        .mdc-data-table__header-cell > * {
          transition: var(--float-start) 0.2s ease;
        }
        .mdc-data-table__header-cell ha-svg-icon {
          top: -3px;
          position: absolute;
        }
        .mdc-data-table__header-cell.not-sorted ha-svg-icon {
          left: -20px;
          inset-inline-start: -20px;
          inset-inline-end: initial;
        }
        .mdc-data-table__header-cell.sortable:not(.not-sorted) span,
        .mdc-data-table__header-cell.sortable.not-sorted:hover span {
          left: 24px;
          inset-inline-start: 24px;
          inset-inline-end: initial;
        }
        .mdc-data-table__header-cell.sortable:not(.not-sorted) ha-svg-icon,
        .mdc-data-table__header-cell.sortable:hover.not-sorted ha-svg-icon {
          left: 12px;
          inset-inline-start: 12px;
          inset-inline-end: initial;
        }
        .table-header {
          border-bottom: 1px solid var(--divider-color);
        }
        search-input {
          display: block;
          flex: 1;
          --mdc-text-field-fill-color: var(--sidebar-background-color);
          --mdc-text-field-idle-line-color: transparent;
        }
        slot[name="header"] {
          display: block;
        }
        .center {
          text-align: center;
        }
        .secondary {
          color: var(--secondary-text-color);
        }
        .scroller {
          height: calc(100% - 57px);
          overflow: overlay !important;
        }

        .mdc-data-table__table.auto-height .scroller {
          overflow-y: hidden !important;
        }
        .grows {
          flex-grow: 1;
          flex-shrink: 1;
        }
        .forceLTR {
          direction: ltr;
        }
        .clickable {
          cursor: pointer;
        }
        lit-virtualizer {
          contain: size layout !important;
          overscroll-behavior: contain;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-data-table": HaDataTable;
  }

  // for fire event
  interface HASSDomEvents {
    "selection-changed": SelectionChangedEvent;
    "row-click": RowClickedEvent;
    "sorting-changed": SortingChangedEvent;
    "collapsed-changed": CollapsedChangedEvent;
  }
}
