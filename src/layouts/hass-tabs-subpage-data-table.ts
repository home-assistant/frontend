import "@material/mwc-button/mwc-button";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { LocalizeFunc } from "../common/translations/localize";
import { computeRTLDirection } from "../common/util/compute_rtl";
import "../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  HaDataTable,
} from "../components/data-table/ha-data-table";
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
   * List of strings that show what the data is currently filtered by.
   * @type {Array}
   */
  @property({ type: Array }) public activeFilters?;

  /**
   * Text to how how many items are hidden.
   * @type {String}
   */
  @property() public hiddenLabel?: string;

  /**
   * How many items are hidden because of active filters.
   * @type {Number}
   */
  @property({ type: Number }) public numHidden = 0;

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
  @property() public backCallback?: () => void;

  /**
   * String to show when there are no records in the data table.
   * @type {String}
   */
  @property({ type: String }) public noDataText?: string;

  @property() public route!: Route;

  /**
   * Array of tabs to show on the page.
   * @type {Array}
   */
  @property() public tabs: PageNavigation[] = [];

  /**
   * Force hides the filter menu.
   * @type {Boolean}
   */
  @property({ type: Boolean }) public hideFilterMenu = false;

  @query("ha-data-table", true) private _dataTable!: HaDataTable;

  public clearSelection() {
    this._dataTable.clearSelection();
  }

  protected render(): TemplateResult {
    const hiddenLabel = this.numHidden
      ? this.hiddenLabel ||
        this.hass.localize(
          "ui.components.data-table.hidden",
          "number",
          this.numHidden
        ) ||
        this.numHidden
      : undefined;

    const filterInfo = this.activeFilters
      ? html`${this.hass.localize("ui.components.data-table.filtering_by")}
        ${this.activeFilters.join(", ")}
        ${hiddenLabel ? `(${hiddenLabel})` : ""}`
      : hiddenLabel;

    const headerToolbar = html`<search-input
      .hass=${this.hass}
      .filter=${this.filter}
      .suffix=${!this.narrow}
      @value-changed=${this._handleSearchChange}
      .label=${this.searchLabel}
    >
      ${!this.narrow
        ? html`<div
            class="filters"
            slot="suffix"
            @click=${this._preventDefault}
          >
            ${filterInfo
              ? html`<div class="active-filters">
                  ${filterInfo}
                  <mwc-button @click=${this._clearFilter}>
                    ${this.hass.localize("ui.components.data-table.clear")}
                  </mwc-button>
                </div>`
              : ""}
            <slot name="filter-menu"></slot>
          </div>`
        : ""}
    </search-input>`;

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
      >
        ${!this.hideFilterMenu
          ? html`
              <div slot="toolbar-icon">
                ${this.narrow
                  ? html`
                      <div class="filter-menu">
                        ${this.numHidden || this.activeFilters
                          ? html`<span class="badge"
                              >${this.numHidden || "!"}</span
                            >`
                          : ""}
                        <slot name="filter-menu"></slot>
                      </div>
                    `
                  : ""}<slot name="toolbar-icon"></slot>
              </div>
            `
          : ""}
        ${this.narrow
          ? html`
              <div slot="header">
                <slot name="header">
                  <div class="search-toolbar">${headerToolbar}</div>
                </slot>
              </div>
            `
          : ""}
        <ha-data-table
          .hass=${this.hass}
          .columns=${this.columns}
          .data=${this.data}
          .filter=${this.filter}
          .selectable=${this.selectable}
          .hasFab=${this.hasFab}
          .id=${this.id}
          .noDataText=${this.noDataText}
          .dir=${computeRTLDirection(this.hass)}
          .clickable=${this.clickable}
          .appendRow=${this.appendRow}
        >
          ${!this.narrow
            ? html`
                <div slot="header">
                  <slot name="header">
                    <div class="table-header">${headerToolbar}</div>
                  </slot>
                </div>
              `
            : html` <div slot="header"></div> `}
        </ha-data-table>
        <div slot="fab"><slot name="fab"></slot></div>
      </hass-tabs-subpage>
    `;
  }

  private _preventDefault(ev) {
    ev.preventDefault();
  }

  private _handleSearchChange(ev: CustomEvent) {
    if (this.filter === ev.detail.value) {
      return;
    }
    this.filter = ev.detail.value;
    fireEvent(this, "search-changed", { value: this.filter });
  }

  private _clearFilter() {
    fireEvent(this, "clear-filter");
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-data-table {
        width: 100%;
        height: 100%;
        --data-table-border-width: 0;
      }
      :host(:not([narrow])) ha-data-table {
        height: calc(100vh - 1px - var(--header-height));
        display: block;
      }
      :host([narrow]) hass-tabs-subpage {
        --main-title-margin: 0;
      }
      .table-header {
        display: flex;
        align-items: center;
        --mdc-shape-small: 0;
        height: 56px;
      }
      .search-toolbar {
        display: flex;
        align-items: center;
        color: var(--secondary-text-color);
      }
      search-input {
        --mdc-text-field-fill-color: var(--sidebar-background-color);
        --mdc-text-field-idle-line-color: var(--divider-color);
        --text-field-overflow: visible;
        z-index: 5;
      }
      .table-header search-input {
        display: block;
        position: absolute;
        top: 0;
        right: 0;
        left: 0;
      }
      .search-toolbar search-input {
        display: block;
        width: 100%;
        color: var(--secondary-text-color);
        --mdc-ripple-color: transparant;
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
        top: 4px;
        font-size: 0.65em;
      }
      .filter-menu {
        position: relative;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-tabs-subpage-data-table": HaTabsSubpageDataTable;
  }
}
