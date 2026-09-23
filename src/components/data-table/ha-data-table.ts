import { consume, type ContextType } from "@lit/context";
import { mdiArrowDown, mdiArrowUp, mdiChevronUp } from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, eventOptions, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { join } from "lit/directives/join";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { STRINGS_SEPARATOR_DOT } from "../../common/const";
import { restoreScroll } from "../../common/decorators/restore-scroll";
import { deepActiveElement } from "../../common/dom/deep-active-element";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomTargetEvent,
} from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import { stringCompare } from "../../common/string/compare";
import type { LocalizeFunc } from "../../common/translations/localize";
import { debounce } from "../../common/util/debounce";
import { groupBy } from "../../common/util/group-by";
import { nextRender } from "../../common/util/render-status";
import { internationalizationContext } from "../../data/context";
import type { FrontendLocaleData } from "../../data/translation";
import { haStyleScrollbar } from "../../resources/styles";
import { loadVirtualizer } from "../../resources/virtualizer";
import "../ha-alert";
import "../ha-checkbox";
import type { HaCheckbox } from "../ha-checkbox";
import "../ha-svg-icon";
import "../input/ha-input-search";
import { filterData, sortData } from "./sort-filter";
import { dataTableModelContext, type DataTableModel } from "./data-table-model";

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
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: ContextType<typeof internationalizationContext>;

  @state() private _filterable = false;

  @state() private _filter = "";

  @state() private _filteredData?: DataTableRowData[];

  @state() private _processing = false;

  @state()
  @consume({ context: dataTableModelContext, subscribe: true })
  private _model!: ContextType<typeof dataTableModelContext>;

  @state() private _headerHeight = 0;

  @query("slot[name='header']") private _header!: HTMLSlotElement;

  @query(".mdc-data-table__header-row") private _headerRow?: HTMLDivElement;

  @query("lit-virtualizer") private _scroller?: HTMLElement;

  @state() private _lastSelectedRowId: string | null = null;

  private _checkableRowsCount?: number;

  private _sortColumns: SortableColumnContainer = {};

  private _curRequest = 0;

  private _lastUpdate = 0;

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
    this._model.update({ selected: [] });
    this._lastSelectedRowId = null;
    this._checkedRowsChanged();
  }

  public selectAll(extraFilter?: (row: DataTableRowData) => boolean): void {
    const selected = (this._filteredData || [])
      .filter(
        (data) =>
          data.selectable !== false && (!extraFilter || extraFilter(data))
      )
      .map((data) => String(data[this._model.id]));
    this._model.update({ selected });
    this._lastSelectedRowId = null;
    this._checkedRowsChanged();
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this._filteredData?.length) {
      // Force update of location of rows
      this._filteredData = [...this._filteredData];
    }
  }

  protected firstUpdated() {
    this.updateComplete.then(() => this._calcTableHeight());
  }

  protected updated(changedProps: PropertyValues) {
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

    const activeElement = deepActiveElement();

    if (
      (changedProps.has("_model") &&
        changedProps.get("_model")?.selectionMode !==
          this._model.selectionMode) ||
      (!this._model.autoHeight &&
        activeElement &&
        AUTO_FOCUS_ALLOWED_ACTIVE_TAGS.includes(activeElement.tagName))
    ) {
      this._focusScroller();
    }
  }

  public willUpdate(properties: PropertyValues) {
    super.willUpdate(properties);

    if (!this._model) {
      return;
    }

    const previousModel: DataTableModel | undefined = properties.get("_model");
    const columnsChanged =
      properties.has("_model") &&
      previousModel?.columns !== this._model.columns;
    const dataChanged =
      properties.has("_model") && previousModel?.data !== this._model.data;
    const modelChanged = properties.has("_model");
    const sortingChanged =
      modelChanged &&
      (previousModel?.sortColumn !== this._model.sortColumn ||
        previousModel?.sortDirection !== this._model.sortDirection);

    if (modelChanged) {
      this.toggleAttribute("narrow", this._model.narrow);
    }

    if (!this.hasUpdated) {
      loadVirtualizer();
    }

    if (columnsChanged) {
      this._filterable = Object.values(this._model.columns).some(
        (column) => column.filterable
      );

      if (!this._model.sortColumn) {
        for (const columnId of Object.keys(this._model.columns)) {
          const direction = this._model.columns[columnId].direction;
          if (direction) {
            this._model.update({
              sortDirection: direction,
              sortColumn: columnId,
            });
            this._lastSelectedRowId = null;

            fireEvent(this, "sorting-changed", {
              column: columnId,
              direction,
            });

            break;
          }
        }
      }

      const clonedColumns: DataTableColumnContainer = deepClone(
        this._model.columns
      );
      Object.values(clonedColumns).forEach(
        (column: ClonedDataTableColumnData) => {
          delete column.title;
          delete column.template;
          delete column.extraTemplate;
        }
      );

      this._sortColumns = clonedColumns;
    }

    if (modelChanged && previousModel?.filter !== this._model.filter) {
      this._debounceSearch(this._model.filter);
      this._lastSelectedRowId = null;
    }

    if (dataChanged || (modelChanged && previousModel?.id !== this._model.id)) {
      // Clean up checked rows that no longer exist in the data
      if (this._model.selected.length) {
        const validIds = new Set(
          this._model.data.map((row) => String(row[this._model.id]))
        );
        const validCheckedRows = this._model.selected.filter((id) =>
          validIds.has(id)
        );
        if (validCheckedRows.length !== this._model.selected.length) {
          this._model.update({ selected: validCheckedRows });
          this._checkedRowsChanged();
        }
      }

      this._checkableRowsCount = this._model.data.filter(
        (row) => row.selectable !== false
      ).length;
    }

    if (
      modelChanged &&
      previousModel &&
      previousModel.groupColumn !== this._model.groupColumn &&
      previousModel.collapsedGroups === this._model.collapsedGroups
    ) {
      this._model.update({ collapsedGroups: [] });
      this._lastSelectedRowId = null;
      fireEvent(this, "collapsed-changed", {
        value: this._model.collapsedGroups,
      });
    }

    if (
      dataChanged ||
      columnsChanged ||
      properties.has("_filter") ||
      sortingChanged
    ) {
      this._sortFilterData();
    }

    if (properties.has("_filter") || sortingChanged) {
      this._lastSelectedRowId = null;
    }

    if (
      this._filteredData &&
      modelChanged &&
      (previousModel?.selectable !== this._model.selectable ||
        previousModel?.selectionMode !== this._model.selectionMode ||
        previousModel?.selected !== this._model.selected ||
        previousModel?.hiddenColumns !== this._model.hiddenColumns)
    ) {
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
    if (!this._model) {
      return nothing;
    }
    const columns = this._sortedColumns(
      this._model.columns,
      this._model.columnOrder
    );
    const loading = this._model.state === "loading";
    const error = this._model.state === "error" ? this._model.error : undefined;

    const renderRow = (row: DataTableRowData, index: number) =>
      this._renderRow(columns, this._model.narrow, row, index);

    const filteredDataLength = this._filteredData?.length || 0;

    return html`
      <div class="mdc-data-table">
        <slot name="header" @slotchange=${this._calcTableHeight}>
          ${
            this._filterable
              ? html`
                  <div class="table-header">
                    <ha-input-search
                      appearance="outlined"
                      @input=${this._handleSearchChange}
                      .placeholder=${this._model.searchLabel}
                      .value=${this._model.filter}
                    ></ha-input-search>
                  </div>
                `
              : ""
          }
        </slot>
        <div
          class="mdc-data-table__table ${classMap({
            "auto-height": this._model.autoHeight,
          })}"
          role="table"
          aria-rowcount=${filteredDataLength + 1}
          style=${styleMap({
            height: this._model.autoHeight
              ? `${(filteredDataLength || 1) * 53 + 53}px`
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
              ${
                this._model.selectable && this._model.selectionMode
                  ? html`
                      <div
                        class="mdc-data-table__header-cell mdc-data-table__header-cell--checkbox"
                        role="columnheader"
                      >
                        <ha-checkbox
                          class="mdc-data-table__row-checkbox"
                          @change=${this._handleHeaderRowCheckboxClick}
                          .indeterminate=${
                            !!this._model.selected.length &&
                            this._model.selected.length !==
                              this._checkableRowsCount
                          }
                          .checked=${
                            !!this._model.selected.length &&
                            this._model.selected.length ===
                              this._checkableRowsCount
                          }
                        >
                        </ha-checkbox>
                      </div>
                    `
                  : ""
              }
              ${Object.entries(columns).map(([key, column]) => {
                if (!this._isColumnVisible(key, column)) {
                  return nothing;
                }
                const sorted = key === this._model.sortColumn;
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
                        ? this._model.sortDirection === "desc"
                          ? "descending"
                          : "ascending"
                        : undefined
                    )}
                    @click=${this._handleHeaderClick}
                    .columnId=${key}
                    title=${ifDefined(column.title)}
                  >
                    ${
                      column.sortable
                        ? html`
                            <ha-svg-icon
                              .path=${
                                sorted && this._model.sortDirection === "desc"
                                  ? mdiArrowDown
                                  : mdiArrowUp
                              }
                            ></ha-svg-icon>
                          `
                        : ""
                    }
                    <span>${column.title}</span>
                  </div>
                `;
              })}
            </slot>
          </div>
          ${
            error
              ? html`<ha-alert alert-type="error">${error}</ha-alert>`
              : nothing
          }
          ${
            error && !this._filteredData?.length && !loading
              ? nothing
              : loading || !this._filteredData?.length
                ? html`
                    <div class="mdc-data-table__content">
                      <div class="mdc-data-table__row" role="row">
                        <div
                          class="mdc-data-table__cell grows center"
                          role="cell"
                        >
                          ${
                            loading || this._processing || !this._filteredData
                              ? this._model.loadingText ||
                                this._i18n?.localize?.("ui.common.loading") ||
                                "Loading"
                              : this._model.data.length
                                ? this._i18n?.localize?.(
                                    "ui.components.data-table.no_match_filter"
                                  ) || "No rows matching current filters"
                                : this._model.noDataText ||
                                  this._i18n?.localize?.(
                                    "ui.components.data-table.no-data"
                                  ) ||
                                  "No data"
                          }
                        </div>
                      </div>
                    </div>
                  `
                : html`
                    <lit-virtualizer
                      scroller
                      class="mdc-data-table__content scroller ha-scrollbar"
                      tabindex=${ifDefined(!this._model.autoHeight ? "0" : undefined)}
                      @scroll=${this._saveScrollPos}
                      .items=${this._groupData(
                        this._filteredData,
                        this._i18n?.localize,
                        this._i18n?.locale,
                        this._model.appendRow,
                        this._model.groupColumn,
                        this._model.groupOrder,
                        this._model.collapsedGroups,
                        this._model.sortColumn,
                        this._model.sortDirection
                      )}
                      .keyFunction=${this._keyFunction}
                      .renderItem=${renderRow}
                    ></lit-virtualizer>
                  `
          }
        </div>
      </div>
    `;
  }

  private _keyFunction = (row: DataTableRowData) =>
    row?.[this._model.id] || row;

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
        .rowId=${row[this._model.id]}
        @click=${this._handleRowClick}
        class="mdc-data-table__row ${classMap({
          "mdc-data-table__row--selected": this._model.selected.includes(
            String(row[this._model.id])
          ),
          clickable: this._model.clickable,
        })}"
        aria-selected=${ifDefined(
          this._model.selected.includes(String(row[this._model.id]))
            ? true
            : undefined
        )}
        .selectable=${row.selectable !== false}
      >
        ${
          this._model.selectable && this._model.selectionMode
            ? html`
                <div
                  class="mdc-data-table__cell mdc-data-table__cell--checkbox"
                  role="cell"
                >
                  <ha-checkbox
                    class="mdc-data-table__row-checkbox"
                    @click=${this._handleRowCheckboxClicked}
                    .rowId=${String(row[this._model.id])}
                    .disabled=${row.selectable === false}
                    .checked=${this._model.selected.includes(String(row[this._model.id]))}
                  >
                  </ha-checkbox>
                </div>
              `
            : ""
        }
        ${Object.entries(columns).map(([key, column]) => {
          if (
            (narrow && !column.main && !column.showNarrow) ||
            !this._isColumnVisible(key, column)
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
              ${
                column.template
                  ? column.template(row)
                  : narrow && column.main
                    ? html`<div class="primary">${row[key]}</div>
                        <div class="secondary">
                          ${join(
                            Object.entries(columns)
                              .filter(([key2, column2]) =>
                                this._isSecondaryColumnVisible(key2, column2)
                              )
                              .map(([key2, column2]) =>
                                column2.template
                                  ? column2.template(row)
                                  : row[key2]
                              )
                              .filter(this._hasCellValue),
                            STRINGS_SEPARATOR_DOT
                          )}
                        </div>
                        ${
                          column.extraTemplate
                            ? column.extraTemplate(row)
                            : nothing
                        }`
                    : html`${row[key]}${
                        column.extraTemplate
                          ? column.extraTemplate(row)
                          : nothing
                      }`
              }
            </div>
          `;
        })}
      </div>
    `;
  };

  private _isColumnVisible(key: string, column: DataTableColumnData): boolean {
    if (column.hidden) {
      return false;
    }
    if (!this._model.columnOrder?.includes(key)) {
      return !column.defaultHidden;
    }
    return !(this._model.hiddenColumns?.includes(key) ?? column.defaultHidden);
  }

  private _isSecondaryColumnVisible(
    key: string,
    column: DataTableColumnData
  ): boolean {
    if (column.main || column.showNarrow) {
      return false;
    }
    return this._isColumnVisible(key, column);
  }

  private _hasCellValue = (value: unknown): boolean =>
    value !== undefined && value !== null && value !== "" && value !== nothing;

  private async _sortFilterData() {
    this._processing = true;
    const startTime = new Date().getTime();
    const timeBetweenUpdate = startTime - this._lastUpdate;
    const timeBetweenRequest = startTime - this._curRequest;
    this._curRequest = startTime;

    const forceUpdate =
      !this._lastUpdate ||
      (timeBetweenUpdate > 500 && timeBetweenRequest < 500);

    let filteredData = this._model.data;
    if (this._filter) {
      filteredData = await this._memFilterData(
        this._model.data,
        this._sortColumns,
        this._filter.trim()
      );
    }

    if (!forceUpdate && this._curRequest !== startTime) {
      return;
    }

    const prom =
      this._model.sortColumn && this._sortColumns[this._model.sortColumn]
        ? sortData(
            filteredData,
            this._sortColumns[this._model.sortColumn],
            this._model.sortDirection,
            this._model.sortColumn,
            this._i18n?.locale?.language
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

    if (this._curRequest === startTime) {
      this._processing = false;
    }
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
                  .label=${
                    localize?.(
                      `ui.components.data-table.${collapsed ? "expand" : "collapse"}`
                    ) || (collapsed ? "Expand" : "Collapse")
                  }
                  class=${collapsed ? "collapsed" : ""}
                >
                </ha-icon-button>
                ${
                  groupName === UNDEFINED_GROUP_KEY
                    ? localize?.("ui.components.data-table.ungrouped") ||
                      "Ungrouped"
                    : groupName || ""
                }
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
    if (!this._model.columns[columnId].sortable) {
      return;
    }
    this._model.update({
      sortColumn: columnId,
      sortDirection:
        this._model.sortColumn === columnId &&
        this._model.sortDirection === "asc"
          ? "desc"
          : "asc",
    });

    fireEvent(this, "sorting-changed", {
      column: columnId,
      direction: this._model.sortDirection,
    });

    this._focusScroller();
  }

  private _handleHeaderRowCheckboxClick(ev: HASSDomTargetEvent<HaCheckbox>) {
    if (ev.target.checked) {
      this.selectAll();
    } else {
      this._model.update({ selected: [] });
      this._checkedRowsChanged();
    }
    this._lastSelectedRowId = null;
  }

  private _handleRowCheckboxClicked = (ev: MouseEvent) => {
    // ha-checkbox label dispatches synthetic click on input, so handle the input click only
    if (!(ev.composedPath()[0] instanceof HTMLInputElement) && !ev.shiftKey) {
      return;
    }

    // In range select mode, use label click for Firefox since it doesn't fire input click events
    if (ev.composedPath()[0] instanceof HTMLInputElement && ev.shiftKey) {
      ev.preventDefault();
    }

    const checkboxElement = ev.currentTarget as HaCheckbox & { rowId: string };

    const rowId = checkboxElement.rowId;

    const groupedData = this._groupData(
      this._filteredData || [],
      this._i18n?.localize,
      this._i18n?.locale,
      this._model.appendRow,
      this._model.groupColumn,
      this._model.groupOrder,
      this._model.collapsedGroups,
      this._model.sortColumn,
      this._model.sortDirection
    );

    if (
      groupedData.find((data) => String(data[this._model.id]) === rowId)
        ?.selectable === false
    ) {
      return;
    }

    const rowIndex = groupedData.findIndex(
      (data) => String(data[this._model.id]) === rowId
    );

    if (
      ev instanceof MouseEvent &&
      ev.shiftKey &&
      this._lastSelectedRowId !== null
    ) {
      const lastSelectedRowIndex = groupedData.findIndex(
        (data) => String(data[this._model.id]) === this._lastSelectedRowId
      );

      if (lastSelectedRowIndex > -1 && rowIndex > -1) {
        this._model.update({
          selected: [
            ...this._model.selected,
            ...this._selectRange(groupedData, lastSelectedRowIndex, rowIndex),
          ],
        });
      }
    } else if (checkboxElement.checked) {
      if (!this._model.selected.includes(rowId)) {
        this._model.update({ selected: [...this._model.selected, rowId] });
      }
    } else {
      this._model.update({
        selected: this._model.selected.filter((row) => row !== rowId),
      });
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
        !this._model.selected.includes(String(row[this._model.id]))
      ) {
        checkedRows.push(String(row[this._model.id]));
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
    if (this._filteredData?.length) {
      this._filteredData = [...this._filteredData];
    }
    fireEvent(this, "selection-changed", {
      value: this._model.selected,
    });
  }

  private _handleSearchChange(
    ev: InputEvent & HASSDomTargetEvent<HTMLInputElement>
  ): void {
    this._lastSelectedRowId = null;
    this._model.update({ filter: ev.target.value });
  }

  private _focusScroller(): void {
    this._scroller?.focus({
      preventScroll: true,
    });
  }

  private async _calcTableHeight() {
    if (!this._model || this._model.autoHeight) {
      return;
    }
    await this.updateComplete;
    this._headerHeight = this._header?.clientHeight ?? 0;
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
    if (this._model.collapsedGroups.includes(groupName)) {
      this._model.update({
        collapsedGroups: this._model.collapsedGroups.filter(
          (grp) => grp !== groupName
        ),
      });
    } else {
      this._model.update({
        collapsedGroups: [...this._model.collapsedGroups, groupName],
      });
    }
    this._lastSelectedRowId = null;
    fireEvent(this, "collapsed-changed", {
      value: this._model.collapsedGroups,
    });
  };

  public expandAllGroups() {
    this._model.update({ collapsedGroups: [] });
    this._lastSelectedRowId = null;
    fireEvent(this, "collapsed-changed", {
      value: this._model.collapsedGroups,
    });
  }

  public collapseAllGroups() {
    if (
      !this._model.groupColumn ||
      !this._model.data.some((item) => item[this._model.groupColumn!])
    ) {
      return;
    }
    const grouped = groupBy(
      this._model.data,
      (item) => item[this._model.groupColumn!]
    );
    if (grouped.undefined) {
      // undefined is a reserved group name
      grouped[UNDEFINED_GROUP_KEY] = grouped.undefined;
      delete grouped.undefined;
    }
    this._model.update({ collapsedGroups: Object.keys(grouped) });
    this._lastSelectedRowId = null;
    fireEvent(this, "collapsed-changed", {
      value: this._model.collapsedGroups,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        /* default mdc styles, colors changed, without checkbox styles */
        :host {
          height: 100%;
          --_cell-padding-inline: 16px;
        }

        :host([narrow]) {
          --_cell-padding-inline: 8px;
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

        :host([narrow]) .mdc-data-table {
          width: calc(
            100% + var(--safe-area-inset-left, 0px) +
              var(--safe-area-inset-right, 0px)
          );
          margin-left: calc(-1 * var(--safe-area-inset-left, 0px));
          margin-right: calc(-1 * var(--safe-area-inset-right, 0px));
          overflow: visible;
        }

        :host([narrow]) .mdc-data-table__header-row {
          overflow: visible;
        }

        /* Hide scrollbar for Chrome, Safari and Opera */
        .mdc-data-table__header-row::-webkit-scrollbar {
          display: none;
        }

        .mdc-data-table__header-row {
          scrollbar-width: none;
        }

        .mdc-data-table__cell,
        .mdc-data-table__header-cell {
          padding-inline: var(--_cell-padding-inline);
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
          padding-inline-start: var(--_cell-padding-inline);
          padding-inline-end: 0;
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
          padding-inline-start: var(--_cell-padding-inline);
          padding-inline-end: initial;
        }

        .mdc-data-table__cell--overflow-menu:last-child,
        .mdc-data-table__header-cell--overflow-menu:last-child,
        .mdc-data-table__header-cell--icon-button:last-child,
        .mdc-data-table__cell--icon-button:last-child {
          padding-inline-end: var(--_cell-padding-inline);
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
        @media (min-width: 871px) {
          ha-input-search {
            --ha-input-search-height: 32px;
            --ha-input-search-border-radius: 10px;
          }
        }
        slot[name="header"] {
          display: block;
        }
        .center {
          text-align: center;
        }
        .primary {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .secondary {
          color: var(--secondary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }
        .scroller {
          height: calc(100% - 57px);
          overflow: overlay !important;
        }

        :host([narrow]) .mdc-data-table__row {
          box-sizing: border-box;
          padding-left: var(--safe-area-inset-left, 0px);
          padding-right: var(--safe-area-inset-right, 0px);
        }

        :host([narrow]) .mdc-data-table__row:has(.group-header) {
          background-color: var(--primary-background-color);
        }

        .mdc-data-table__table.auto-height .scroller {
          overflow-y: hidden !important;
        }

        .mdc-data-table__table.auto-height lit-virtualizer {
          overscroll-behavior-y: auto;
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

        ha-checkbox {
          padding: var(--ha-space-1);
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
