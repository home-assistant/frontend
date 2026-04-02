import { consume, type ContextType } from "@lit/context";
import { mdiArrowDown, mdiArrowUp, mdiChevronUp } from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
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
import { STRINGS_SEPARATOR_DOT } from "../../common/const";
import { restoreScroll } from "../../common/decorators/restore-scroll";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomTargetEvent,
} from "../../common/dom/fire_event";
import { stringCompare } from "../../common/string/compare";
import type { LocalizeFunc } from "../../common/translations/localize";
import { debounce } from "../../common/util/debounce";
import { groupBy } from "../../common/util/group-by";
import { nextRender } from "../../common/util/render-status";
import { localeContext, localizeContext } from "../../data/context";
import type { FrontendLocaleData } from "../../data/translation";
import { haStyleScrollbar } from "../../resources/styles";
import { loadVirtualizer } from "../../resources/virtualizer";
import "../ha-checkbox";
import type { HaCheckbox } from "../ha-checkbox";
import "../ha-svg-icon";
import "../input/ha-input-search";
import { filterData, sortData } from "./sort-filter";

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

export type DataTableColumnContainer<T = any> = Record<
  string,
  DataTableColumnData<T>
>;

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
    | "ip"
    | "icon"
    | "icon-button"
    | "overflow"
    | "overflow-menu"
    | "flex";
  template?: (row: T) => TemplateResult | string | typeof nothing;
  extraTemplate?: (row: T) => TemplateResult | string | typeof nothing;
  minWidth?: string;
  maxWidth?: string;
  flex?: number;
  forceLTR?: boolean;
  hidden?: boolean;
  lastFixed?: boolean;
}

export type ClonedDataTableColumnData = Omit<DataTableColumnData, "title"> & {
  title?: TemplateResult | string;
};

export interface DataTableRowData {
  [key: string]: any;
  selectable?: boolean;
}

export type SortableColumnContainer = Record<string, ClonedDataTableColumnData>;

const UNDEFINED_GROUP_KEY = "zzzzz_undefined";
const AUTO_FOCUS_ALLOWED_ACTIVE_TAGS = ["BODY", "HTML", "HOME-ASSISTANT"];

@customElement("ha-data-table")
export class HaDataTable extends LitElement {
  @state()
  @consume({ context: localizeContext, subscribe: true })
  private _localize?: ContextType<typeof localizeContext>;

  @state()
  @consume({ context: localeContext, subscribe: true })
  private _locale?: ContextType<typeof localeContext>;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Object }) public columns: DataTableColumnContainer = {};

  @property({ type: Array }) public data: DataTableRowData[] = [];

  @property({ type: Boolean }) public selectable = false;

  @property({ type: Boolean }) public clickable = false;

  /**
   * Add an extra row at the bottom of the data table
   * @type {TemplateResult}
   */
  @property({ attribute: false }) public appendRow?;

  @property({ type: Boolean, attribute: "auto-height" })
  public autoHeight = false;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: String }) public id = "id";

  @property({ attribute: false }) public noDataText?: string;

  @property({ attribute: false }) public searchLabel?: string;

  @property({ type: String }) public filter = "";

  @property({ attribute: false }) public groupColumn?: string;

  @property({ attribute: false }) public groupOrder?: string[];

  @property({ attribute: false }) public sortColumn?: string;

  @property({ attribute: false }) public sortDirection: SortingDirection = null;

  @property({ attribute: false }) public initialCollapsedGroups?: string[];

  @property({ attribute: false }) public hiddenColumns?: string[];

  @property({ attribute: false }) public columnOrder?: string[];

  @state() private _filterable = false;

  @state() private _filter = "";

  @state() private _filteredData: DataTableRowData[] = [];

  @state() private _headerHeight = 0;

  @query("slot[name='header']") private _header!: HTMLSlotElement;

  @query(".mdc-data-table__header-row") private _headerRow?: HTMLDivElement;

  @query("lit-virtualizer") private _scroller?: HTMLElement;

  @state() private _collapsedGroups: string[] = [];

  @state() private _lastSelectedRowId: string | null = null;

  private _checkableRowsCount?: number;

  private _checkedRows: string[] = [];

  private _sortColumns: SortableColumnContainer = {};

  private _curRequest = 0;

  private _lastUpdate = 0;

  private _didAutoFocusScroller = false;

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
    this._lastSelectedRowId = null;
    this._checkedRowsChanged();
  }

  public selectAll(): void {
    this._checkedRows = this._filteredData
      .filter((data) => data.selectable !== false)
      .map((data) => data[this.id]);
    this._lastSelectedRowId = null;
    this._checkedRowsChanged();
  }

  public select(ids: string[], clear?: boolean): void {
    if (clear) {
      this._checkedRows = [];
    }
    ids.forEach((id) => {
      const row = this._filteredData.find((data) => data[this.id] === id);
      if (row?.selectable !== false && !this._checkedRows.includes(id)) {
        this._checkedRows.push(id);
      }
    });
    this._lastSelectedRowId = null;
    this._checkedRowsChanged();
  }

  public unselect(ids: string[]): void {
    ids.forEach((id) => {
      const index = this._checkedRows.indexOf(id);
      if (index > -1) {
        this._checkedRows.splice(index, 1);
      }
    });
    this._lastSelectedRowId = null;
    this._checkedRowsChanged();
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this._filteredData.length) {
      // Force update of location of rows
      this._filteredData = [...this._filteredData];
    }
  }

  protected firstUpdated() {
    this.updateComplete.then(() => this._calcTableHeight());
  }

  protected updated() {
    if (!this._headerRow) {
      return;
    }
    if (this._headerRow.scrollWidth > this._headerRow.clientWidth) {
      this.style.setProperty(
        "--table-row-width",
        `${this._headerRow.scrollWidth}px`
      );
    } else {
      this.style.removeProperty("--table-row-width");
    }

    this._focusTableOnLoad();
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
            this._lastSelectedRowId = null;

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
      this._lastSelectedRowId = null;
    }

    if (properties.has("data")) {
      // Clean up checked rows that no longer exist in the data
      if (this._checkedRows.length) {
        const validIds = new Set(this.data.map((row) => String(row[this.id])));
        const validCheckedRows = this._checkedRows.filter((id) =>
          validIds.has(id)
        );
        if (validCheckedRows.length !== this._checkedRows.length) {
          this._checkedRows = validCheckedRows;
          this._checkedRowsChanged();
        }
      }

      this._checkableRowsCount = this.data.filter(
        (row) => row.selectable !== false
      ).length;
    }

    if (!this.hasUpdated && this.initialCollapsedGroups) {
      this._collapsedGroups = this.initialCollapsedGroups;
      this._lastSelectedRowId = null;
      fireEvent(this, "collapsed-changed", { value: this._collapsedGroups });
    } else if (properties.has("groupColumn")) {
      this._collapsedGroups = [];
      this._lastSelectedRowId = null;
      fireEvent(this, "collapsed-changed", { value: this._collapsedGroups });
    }

    if (
      properties.has("data") ||
      properties.has("columns") ||
      properties.has("_filter") ||
      properties.has("sortColumn") ||
      properties.has("sortDirection")
    ) {
      this._sortFilterData();
    }

    if (
      properties.has("_filter") ||
      properties.has("sortColumn") ||
      properties.has("sortDirection")
    ) {
      this._lastSelectedRowId = null;
    }

    if (properties.has("selectable") || properties.has("hiddenColumns")) {
      this._filteredData = [...this._filteredData];
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
          const fixedA = Boolean(columns[a].lastFixed);
          const fixedB = Boolean(columns[b].lastFixed);
          if (fixedA !== fixedB) {
            return fixedA ? 1 : -1;
          }
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
    const columns = this._sortedColumns(this.columns, this.columnOrder);

    const renderRow = (row: DataTableRowData, index: number) =>
      this._renderRow(columns, this.narrow, row, index);

    return html`
      <div class="mdc-data-table">
        <slot name="header" @slotchange=${this._calcTableHeight}>
          ${this._filterable
            ? html`
                <div class="table-header">
                  <ha-input-search
                    appearance="outlined"
                    @input=${this._handleSearchChange}
                    .placeholder=${this.searchLabel}
                  ></ha-input-search>
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
          <div
            class="mdc-data-table__header-row"
            role="row"
            aria-rowindex="1"
            @scroll=${this._scrollContent}
          >
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
                        .indeterminate=${!!this._checkedRows.length &&
                        this._checkedRows.length !== this._checkableRowsCount}
                        .checked=${!!this._checkedRows.length &&
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
                };
                return html`
                  <div
                    aria-label=${ifDefined(column.label)}
                    class="mdc-data-table__header-cell ${classMap(classes)}"
                    style=${styleMap({
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                      flex: column.flex || 1,
                    })}
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
                    title=${ifDefined(column.title)}
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
                      this._localize?.("ui.components.data-table.no-data") ||
                      "No data"}
                    </div>
                  </div>
                </div>
              `
            : html`
                <lit-virtualizer
                  scroller
                  class="mdc-data-table__content scroller ha-scrollbar"
                  tabindex=${ifDefined(!this.autoHeight ? "0" : undefined)}
                  @scroll=${this._saveScrollPos}
                  .items=${this._groupData(
                    this._filteredData,
                    this._localize,
                    this._locale,
                    this.appendRow,
                    this.groupColumn,
                    this.groupOrder,
                    this._collapsedGroups,
                    this.sortColumn,
                    this.sortDirection
                  )}
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
      return html`<div class="mdc-data-table__row empty-row"></div>`;
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
                  @click=${this._handleRowCheckboxClicked}
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
                forceLTR: Boolean(column.forceLTR),
              })}"
              style=${styleMap({
                minWidth: column.minWidth,
                maxWidth: column.maxWidth,
                flex: column.flex || 1,
              })}
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
                                ? STRINGS_SEPARATOR_DOT
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
    const timeBetweenUpdate = startTime - this._lastUpdate;
    const timeBetweenRequest = startTime - this._curRequest;
    this._curRequest = startTime;

    const forceUpdate =
      !this._lastUpdate ||
      (timeBetweenUpdate > 500 && timeBetweenRequest < 500);

    let filteredData = this.data;
    if (this._filter) {
      filteredData = await this._memFilterData(
        this.data,
        this._sortColumns,
        this._filter.trim()
      );
    }

    if (!forceUpdate && this._curRequest !== startTime) {
      return;
    }

    const prom =
      this.sortColumn && this._sortColumns[this.sortColumn]
        ? sortData(
            filteredData,
            this._sortColumns[this.sortColumn],
            this.sortDirection,
            this.sortColumn,
            this._locale?.language
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

    if (!forceUpdate && this._curRequest !== startTime) {
      return;
    }

    this._lastUpdate = startTime;
    this._filteredData = data;
  }

  private _groupData = memoizeOne(
    (
      data: DataTableRowData[],
      localize: LocalizeFunc | undefined,
      locale: FrontendLocaleData | undefined,
      appendRow,
      groupColumn: string | undefined,
      groupOrder: string[] | undefined,
      collapsedGroups: string[],
      sortColumn: string | undefined,
      sortDirection: SortingDirection
    ) => {
      if (appendRow || groupColumn) {
        let items = [...data];

        if (groupColumn) {
          const isGroupSortColumn = sortColumn === groupColumn;
          const grouped = groupBy(items, (item) => item[groupColumn]);
          if (grouped.undefined) {
            // make sure ungrouped items are at the bottom
            grouped[UNDEFINED_GROUP_KEY] = grouped.undefined;
            delete grouped.undefined;
          }
          const sortedEntries: [string, DataTableRowData[]][] = Object.keys(
            grouped
          )
            .sort((a, b) => {
              if (!groupOrder && isGroupSortColumn) {
                const comparison = stringCompare(a, b, locale?.language);
                if (sortDirection === "asc") {
                  return comparison;
                }
                return comparison * -1;
              }

              const orderA = groupOrder?.indexOf(a) ?? -1;
              const orderB = groupOrder?.indexOf(b) ?? -1;
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
                locale?.language
              );
            })
            .reduce(
              (entries, key) => {
                const entry: [string, DataTableRowData[]] = [key, grouped[key]];

                entries.push(entry);
                return entries;
              },
              [] as [string, DataTableRowData[]][]
            );

          const groupedItems: DataTableRowData[] = [];
          sortedEntries.forEach(([groupName, rows]) => {
            const collapsed = collapsedGroups.includes(groupName);
            groupedItems.push({
              append: true,
              selectable: false,
              content: html`<div
                class="mdc-data-table__cell group-header"
                role="cell"
                .group=${groupName}
                @click=${this._collapseGroup}
              >
                <ha-icon-button
                  .path=${mdiChevronUp}
                  .label=${localize?.(
                    `ui.components.data-table.${collapsed ? "expand" : "collapse"}`
                  ) || (collapsed ? "Expand" : "Collapse")}
                  class=${collapsed ? "collapsed" : ""}
                >
                </ha-icon-button>
                ${groupName === UNDEFINED_GROUP_KEY
                  ? localize?.("ui.components.data-table.ungrouped") ||
                    "Ungrouped"
                  : groupName || ""}
              </div>`,
            });
            if (!collapsedGroups.includes(groupName)) {
              groupedItems.push(...rows);
            }
          });
          items = groupedItems;
        }

        if (appendRow) {
          items.push({ append: true, selectable: false, content: appendRow });
        }

        items.push({ empty: true });

        return items;
      }
      return [...data, { empty: true }];
    }
  );

  private _memFilterData = memoizeOne(
    (
      data: DataTableRowData[],
      columns: SortableColumnContainer,
      filter: string
    ): Promise<DataTableRowData[]> => filterData(data, columns, filter)
  );

  private _handleHeaderClick(
    ev: HASSDomCurrentTargetEvent<HTMLElement & { columnId: string }>
  ) {
    const columnId = ev.currentTarget.columnId;
    if (!this.columns[columnId].sortable) {
      return;
    }
    if (!this.sortDirection || this.sortColumn !== columnId) {
      this.sortDirection = "asc";
    } else if (this.sortDirection === "asc") {
      this.sortDirection = "desc";
    } else {
      this.sortDirection = "asc";
    }

    this.sortColumn = columnId;

    fireEvent(this, "sorting-changed", {
      column: columnId,
      direction: this.sortDirection,
    });

    this._focusScroller();
  }

  private _handleHeaderRowCheckboxClick(ev: HASSDomTargetEvent<HaCheckbox>) {
    if (ev.target.checked) {
      this.selectAll();
    } else {
      this._checkedRows = [];
      this._checkedRowsChanged();
    }
    this._lastSelectedRowId = null;
  }

  private _handleRowCheckboxClicked = (
    ev: HASSDomCurrentTargetEvent<HaCheckbox & { rowId: string }>
  ) => {
    const rowId = ev.currentTarget.rowId;

    const groupedData = this._groupData(
      this._filteredData,
      this._localize,
      this._locale,
      this.appendRow,
      this.groupColumn,
      this.groupOrder,
      this._collapsedGroups,
      this.sortColumn,
      this.sortDirection
    );

    if (
      groupedData.find((data) => data[this.id] === rowId)?.selectable === false
    ) {
      return;
    }

    const rowIndex = groupedData.findIndex((data) => data[this.id] === rowId);

    if (
      ev instanceof MouseEvent &&
      ev.shiftKey &&
      this._lastSelectedRowId !== null
    ) {
      const lastSelectedRowIndex = groupedData.findIndex(
        (data) => data[this.id] === this._lastSelectedRowId
      );

      if (lastSelectedRowIndex > -1 && rowIndex > -1) {
        this._checkedRows = [
          ...this._checkedRows,
          ...this._selectRange(groupedData, lastSelectedRowIndex, rowIndex),
        ];
      }
    } else if (!ev.currentTarget.checked) {
      if (!this._checkedRows.includes(rowId)) {
        this._checkedRows = [...this._checkedRows, rowId];
      }
    } else {
      this._checkedRows = this._checkedRows.filter((row) => row !== rowId);
    }

    if (rowIndex > -1) {
      this._lastSelectedRowId = rowId;
    }
    this._checkedRowsChanged();
  };

  private _selectRange(
    groupedData: DataTableRowData[],
    startIndex: number,
    endIndex: number
  ) {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);

    const checkedRows: string[] = [];

    for (let i = start; i <= end; i++) {
      const row = groupedData[i];
      if (
        row &&
        row.selectable !== false &&
        !this._checkedRows.includes(row[this.id])
      ) {
        checkedRows.push(row[this.id]);
      }
    }

    return checkedRows;
  }

  private _handleRowClick = (
    ev: HASSDomCurrentTargetEvent<HTMLElement & { rowId: string }>
  ) => {
    if (
      ev
        .composedPath()
        .find((el) =>
          [
            "ha-checkbox",
            "ha-button",
            "ha-button",
            "ha-icon-button",
            "ha-assist-chip",
          ].includes((el as HTMLElement).localName)
        )
    ) {
      return;
    }
    const rowId = ev.currentTarget.rowId;
    fireEvent(this, "row-click", { id: rowId }, { bubbles: false });
  };

  private _setTitle(ev: HASSDomCurrentTargetEvent<HTMLElement>) {
    if (ev.currentTarget.scrollWidth > ev.currentTarget.offsetWidth) {
      ev.currentTarget.setAttribute("title", ev.currentTarget.innerText);
    }
  }

  private _checkedRowsChanged() {
    // force scroller to update, change it's items
    if (this._filteredData.length) {
      this._filteredData = [...this._filteredData];
    }
    fireEvent(this, "selection-changed", {
      value: this._checkedRows,
    });
  }

  private _handleSearchChange(ev: InputEvent): void {
    if (this.filter) {
      return;
    }
    this._lastSelectedRowId = null;
    this._debounceSearch((ev.target as HTMLInputElement).value);
  }

  private _focusTableOnLoad() {
    if (
      this._didAutoFocusScroller ||
      this.autoHeight ||
      (document.activeElement &&
        !AUTO_FOCUS_ALLOWED_ACTIVE_TAGS.includes(
          document.activeElement.tagName
        ))
    ) {
      return;
    }

    this._focusScroller(true);
  }

  private _focusScroller(trackAutoFocus = false): void {
    if (!this._scroller) {
      return;
    }

    this._scroller.focus({
      preventScroll: true,
    });

    if (trackAutoFocus) {
      this._didAutoFocusScroller =
        (this.renderRoot as ShadowRoot).activeElement === this._scroller;
    }
  }

  private async _calcTableHeight() {
    if (this.autoHeight) {
      return;
    }
    await this.updateComplete;
    this._headerHeight = this._header.clientHeight;
  }

  @eventOptions({ passive: true })
  private _saveScrollPos(e: HASSDomTargetEvent<HTMLDivElement>) {
    this._savedScrollPos = e.target.scrollTop;

    if (this._headerRow) {
      this._headerRow.scrollLeft = e.target.scrollLeft;
    }
  }

  @eventOptions({ passive: true })
  private _scrollContent(e: HASSDomTargetEvent<HTMLDivElement>) {
    if (!this._scroller) {
      return;
    }

    this._scroller.scrollLeft = e.target.scrollLeft;
  }

  private _collapseGroup = (
    ev: HASSDomCurrentTargetEvent<HTMLElement & { group: string }>
  ) => {
    const groupName = ev.currentTarget.group;
    if (this._collapsedGroups.includes(groupName)) {
      this._collapsedGroups = this._collapsedGroups.filter(
        (grp) => grp !== groupName
      );
    } else {
      this._collapsedGroups = [...this._collapsedGroups, groupName];
    }
    this._lastSelectedRowId = null;
    fireEvent(this, "collapsed-changed", { value: this._collapsedGroups });
  };

  public expandAllGroups() {
    this._collapsedGroups = [];
    this._lastSelectedRowId = null;
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
    this._lastSelectedRowId = null;
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
          font-family: var(--ha-font-family-body);
          -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
          -webkit-font-smoothing: var(--ha-font-smoothing);
          font-size: 0.875rem;
          line-height: var(--ha-line-height-condensed);
          font-weight: var(--ha-font-weight-normal);
          letter-spacing: 0.0178571429em;
          text-decoration: inherit;
          text-transform: inherit;
        }

        .mdc-data-table {
          background-color: var(--data-table-background-color);
          border-radius: var(--ha-border-radius-sm);
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
          height: var(--data-table-row-height, 52px);
          width: var(--table-row-width, 100%);
        }

        .mdc-data-table__row.empty-row {
          height: var(
            --data-table-empty-row-height,
            var(--safe-area-inset-bottom, 0px)
          );
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
          border-bottom: 1px solid var(--divider-color);
          overflow: auto;
        }

        /* Hide scrollbar for Chrome, Safari and Opera */
        .mdc-data-table__header-row::-webkit-scrollbar {
          display: none;
        }

        /* Hide scrollbar for IE, Edge and Firefox */
        .mdc-data-table__header-row {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }

        .mdc-data-table__cell,
        .mdc-data-table__header-cell {
          padding-right: 16px;
          padding-left: 16px;
          min-width: 150px;
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
          min-width: 60px;
        }

        .mdc-data-table__table {
          height: 100%;
          width: 100%;
          border: 0;
          white-space: nowrap;
          position: relative;
        }

        .mdc-data-table__cell {
          font-family: var(--ha-font-family-body);
          -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
          -webkit-font-smoothing: var(--ha-font-smoothing);
          font-size: 0.875rem;
          line-height: var(--ha-line-height-condensed);
          font-weight: var(--ha-font-weight-normal);
          letter-spacing: 0.0178571429em;
          text-decoration: inherit;
          text-transform: inherit;
          flex-grow: 0;
          flex-shrink: 0;
        }

        .mdc-data-table__cell a {
          color: inherit;
          text-decoration: none;
        }

        .mdc-data-table__cell--numeric {
          text-align: var(--float-end);
          direction: ltr;
        }

        .mdc-data-table__cell--icon {
          color: var(--secondary-text-color);
          text-align: center;
        }

        .mdc-data-table__header-cell--icon,
        .mdc-data-table__cell--icon {
          min-width: 64px;
          flex: 0 0 64px !important;
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
          min-width: 64px;
          flex: 0 0 64px !important;
          padding: 8px;
        }

        .mdc-data-table__header-cell--icon-button,
        .mdc-data-table__cell--icon-button {
          min-width: 56px;
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
          font-family: var(--ha-font-family-body);
          -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
          -webkit-font-smoothing: var(--ha-font-smoothing);
          font-size: var(--ha-font-size-s);
          line-height: var(--ha-line-height-normal);
          font-weight: var(--ha-font-weight-medium);
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
          height: var(--data-table-row-height, 52px);
          padding-left: 12px;
          padding-inline-start: 12px;
          padding-inline-end: initial;
          width: 100%;
          font-weight: var(--ha-font-weight-medium);
          display: flex;
          align-items: center;
          cursor: pointer;
          background-color: var(--primary-background-color);
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
        .mdc-data-table__header-cell--numeric > span {
          transition: none;
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
        ha-input-search {
          flex: 1;
          padding: var(--ha-space-3);
        }
        slot[name="header"] {
          display: block;
        }
        .center {
          text-align: center;
        }
        .secondary {
          color: var(--secondary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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

        lit-virtualizer:focus,
        lit-virtualizer:focus-visible {
          outline: none;
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
