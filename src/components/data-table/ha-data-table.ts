import { mdiArrowDown, mdiArrowUp } from "@mdi/js";
import deepClone from "deep-clone-simple";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
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
import { debounce } from "../../common/util/debounce";
import { nextRender } from "../../common/util/render-status";
import { haStyleScrollbar } from "../../resources/styles";
import { loadVirtualizer } from "../../resources/virtualizer";
import { HomeAssistant } from "../../types";
import "../ha-checkbox";
import type { HaCheckbox } from "../ha-checkbox";
import "../ha-svg-icon";
import "../search-input";
import { filterData, sortData } from "./sort-filter";

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

export interface DataTableColumnContainer<T = any> {
  [key: string]: DataTableColumnData<T>;
}

export interface DataTableSortColumnData {
  sortable?: boolean;
  filterable?: boolean;
  filterKey?: string;
  valueColumn?: string;
  direction?: SortingDirection;
}

export interface DataTableColumnData<T = any> extends DataTableSortColumnData {
  main?: boolean;
  title: TemplateResult | string;
  label?: TemplateResult | string;
  type?: "numeric" | "icon" | "icon-button" | "overflow-menu" | "flex";
  template?: (row: T) => TemplateResult | string | typeof nothing;
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

@customElement("ha-data-table")
export class HaDataTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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

  @state() private _filterable = false;

  @state() private _filter = "";

  @state() private _sortColumn?: string;

  @state() private _sortDirection: SortingDirection = null;

  @state() private _filteredData: DataTableRowData[] = [];

  @state() private _headerHeight = 0;

  @query("slot[name='header']") private _header!: HTMLSlotElement;

  @state() private _items: DataTableRowData[] = [];

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

      for (const columnId in this.columns) {
        if (this.columns[columnId].direction) {
          this._sortDirection = this.columns[columnId].direction!;
          this._sortColumn = columnId;
          break;
        }
      }

      const clonedColumns: DataTableColumnContainer = deepClone(this.columns);
      Object.values(clonedColumns).forEach(
        (column: ClonedDataTableColumnData) => {
          delete column.title;
          delete column.template;
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

    if (
      properties.has("data") ||
      properties.has("columns") ||
      properties.has("_filter") ||
      properties.has("_sortColumn") ||
      properties.has("_sortDirection")
    ) {
      this._sortFilterData();
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
            ${Object.entries(this.columns).map(([key, column]) => {
              if (column.hidden) {
                return "";
              }
              const sorted = key === this._sortColumn;
              const classes = {
                "mdc-data-table__header-cell--numeric":
                  column.type === "numeric",
                "mdc-data-table__header-cell--icon": column.type === "icon",
                "mdc-data-table__header-cell--icon-button":
                  column.type === "icon-button",
                "mdc-data-table__header-cell--overflow-menu":
                  column.type === "overflow-menu",
                sortable: Boolean(column.sortable),
                "not-sorted": Boolean(column.sortable && !sorted),
                grows: Boolean(column.grows),
              };
              return html`
                <div
                  aria-label=${column.label}
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
                      ? this._sortDirection === "desc"
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
                          .path=${sorted && this._sortDirection === "desc"
                            ? mdiArrowDown
                            : mdiArrowUp}
                        ></ha-svg-icon>
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
                  <div class="mdc-data-table__row" role="row">
                    <div class="mdc-data-table__cell grows center" role="cell">
                      ${this.noDataText ||
                      this.hass.localize("ui.components.data-table.no-data")}
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
                  .renderItem=${this._renderRow}
                ></lit-virtualizer>
              `}
        </div>
      </div>
    `;
  }

  private _keyFunction = (row: DataTableRowData) => row[this.id] || row;

  private _renderRow = (row: DataTableRowData, index: number) => {
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
        ${Object.entries(this.columns).map(([key, column]) => {
          if (column.hidden) {
            return "";
          }
          return html`
            <div
              role=${column.main ? "rowheader" : "cell"}
              class="mdc-data-table__cell ${classMap({
                "mdc-data-table__cell--flex": column.type === "flex",
                "mdc-data-table__cell--numeric": column.type === "numeric",
                "mdc-data-table__cell--icon": column.type === "icon",
                "mdc-data-table__cell--icon-button":
                  column.type === "icon-button",
                "mdc-data-table__cell--overflow-menu":
                  column.type === "overflow-menu",
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
              ${column.template ? column.template(row) : row[key]}
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

    const prom = this._sortColumn
      ? sortData(
          filteredData,
          this._sortColumns[this._sortColumn],
          this._sortDirection,
          this._sortColumn,
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

    if (this.appendRow || this.hasFab) {
      const items = [...data];

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
    const target = ev.target as HTMLElement;
    if (["HA-CHECKBOX", "MWC-BUTTON"].includes(target.tagName)) {
      return;
    }
    const rowId = (ev.currentTarget as any).rowId;
    fireEvent(this, "row-click", { id: rowId }, { bubbles: false });
  };

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
          height: 52px;
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
          width: 60px;
        }
        :host([dir="rtl"]) .mdc-data-table__header-cell--checkbox,
        :host([dir="rtl"]) .mdc-data-table__cell--checkbox {
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

        .mdc-data-table__cell a {
          color: inherit;
          text-decoration: none;
        }

        .mdc-data-table__cell--numeric {
          text-align: right;
        }
        :host([dir="rtl"]) .mdc-data-table__cell--numeric {
          /* @noflip */
          text-align: left;
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
          text-align: left;
        }
        :host([dir="rtl"])
          .mdc-data-table__header-cell.sortable.mdc-data-table__header-cell--icon:hover,
        :host([dir="rtl"])
          .mdc-data-table__header-cell.sortable.mdc-data-table__header-cell--icon:not(
            .not-sorted
          ) {
          text-align: right;
        }

        .mdc-data-table__cell--icon:first-child ha-icon,
        .mdc-data-table__cell--icon:first-child img,
        .mdc-data-table__cell--icon:first-child ha-state-icon,
        .mdc-data-table__cell--icon:first-child ha-svg-icon {
          margin-left: 8px;
        }
        :host([dir="rtl"]) .mdc-data-table__cell--icon:first-child ha-icon,
        :host([dir="rtl"])
          .mdc-data-table__cell--icon:first-child
          ha-state-icon,
        :host([dir="rtl"])
          .mdc-data-table__cell--icon:first-child
          ha-svg-icon
          :host([dir="rtl"])
          .mdc-data-table__cell--icon:first-child
          img {
          margin-left: auto;
          margin-right: 8px;
        }

        .mdc-data-table__cell--icon:first-child state-badge {
          margin-right: -8px;
        }
        :host([dir="rtl"]) .mdc-data-table__cell--icon:first-child state-badge {
          margin-right: auto;
          margin-left: -8px;
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
        }
        :host([dir="rtl"])
          .mdc-data-table__header-cell--overflow-menu:first-child,
        :host([dir="rtl"]) .mdc-data-table__cell--overflow-menu:first-child,
        :host([dir="rtl"])
          .mdc-data-table__header-cell--overflow-menu:first-child,
        :host([dir="rtl"]) .mdc-data-table__cell--overflow-menu:first-child {
          padding-left: 8px;
          padding-right: 16px;
        }

        .mdc-data-table__cell--overflow-menu:last-child,
        .mdc-data-table__header-cell--overflow-menu:last-child,
        .mdc-data-table__header-cell--icon-button:last-child,
        .mdc-data-table__cell--icon-button:last-child {
          padding-right: 16px;
        }
        :host([dir="rtl"])
          .mdc-data-table__header-cell--overflow-menu:last-child,
        :host([dir="rtl"]) .mdc-data-table__cell--overflow-menu:last-child,
        :host([dir="rtl"]) .mdc-data-table__header-cell--icon-button:last-child,
        :host([dir="rtl"]) .mdc-data-table__cell--icon-button:last-child {
          padding-right: 8px;
          padding-left: 16px;
        }
        .mdc-data-table__cell--overflow-menu,
        .mdc-data-table__header-cell--overflow-menu {
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
          text-align: left;
        }
        :host([dir="rtl"]) .mdc-data-table__header-cell {
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
        :host([dir="rtl"]) .mdc-data-table__header-cell--numeric {
          /* @noflip */
          text-align: left;
        }
        :host([dir="rtl"]) .mdc-data-table__header-cell--numeric.sortable:hover,
        :host([dir="rtl"])
          .mdc-data-table__header-cell--numeric.sortable:not(.not-sorted) {
          text-align: right;
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
        :host([dir="rtl"]) .mdc-data-table__header-cell span {
          left: auto;
          right: 0px;
        }

        .mdc-data-table__header-cell.sortable {
          cursor: pointer;
        }
        .mdc-data-table__header-cell > * {
          transition: left 0.2s ease;
        }
        :host([dir="rtl"]) .mdc-data-table__header-cell > * {
          transition: right 0.2s ease;
        }
        .mdc-data-table__header-cell ha-svg-icon {
          top: -3px;
          position: absolute;
        }
        .mdc-data-table__header-cell.not-sorted ha-svg-icon {
          left: -20px;
        }
        :host([dir="rtl"]) .mdc-data-table__header-cell.not-sorted ha-svg-icon {
          right: -20px;
        }
        .mdc-data-table__header-cell.sortable:not(.not-sorted) span,
        .mdc-data-table__header-cell.sortable.not-sorted:hover span {
          left: 24px;
        }
        :host([dir="rtl"])
          .mdc-data-table__header-cell.sortable:not(.not-sorted)
          span,
        :host([dir="rtl"])
          .mdc-data-table__header-cell.sortable.not-sorted:hover
          span {
          left: auto;
          right: 24px;
        }
        .mdc-data-table__header-cell.sortable:not(.not-sorted) ha-svg-icon,
        .mdc-data-table__header-cell.sortable:hover.not-sorted ha-svg-icon {
          left: 12px;
        }
        :host([dir="rtl"])
          .mdc-data-table__header-cell.sortable:not(.not-sorted)
          ha-svg-icon,
        :host([dir="rtl"])
          .mdc-data-table__header-cell.sortable:hover.not-sorted
          ha-svg-icon {
          left: auto;
          right: 12px;
        }
        .table-header {
          border-bottom: 1px solid var(--divider-color);
        }
        search-input {
          display: block;
          flex: 1;
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
}
