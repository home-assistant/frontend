import "@material/mwc-button/mwc-button";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { navigate } from "../common/navigate";
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

@customElement("hass-tabs-subpage-data-table")
export class HaTabsSubpageDataTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

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
   * Field with a unique id per entry in data.
   * @type {String}
   */
  @property({ type: String }) public id = "id";

  /**
   * String to filter the data in the data table on.
   * @type {String}
   */
  @property({ type: String }) public filter = "";

  /**
   * List of strings that show what the data is currently filtered by.
   * @type {Array}
   */
  @property({ type: Array }) public activeFilters?;

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
  @property() public tabs!: PageNavigation[];

  @query("ha-data-table", true) private _dataTable!: HaDataTable;

  public clearSelection() {
    this._dataTable.clearSelection();
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        .backPath=${this.backPath}
        .backCallback=${this.backCallback}
        .route=${this.route}
        .tabs=${this.tabs}
      >
        <div slot="toolbar-icon"><slot name="toolbar-icon"></slot></div>
        ${this.narrow
          ? html`
              <div slot="header">
                <slot name="header">
                  <div class="search-toolbar">
                    <search-input
                      .filter=${this.filter}
                      class="header"
                      no-label-float
                      no-underline
                      @value-changed=${this._handleSearchChange}
                      .label=${this.hass.localize(
                        "ui.components.data-table.search"
                      )}
                    ></search-input>
                    ${this.activeFilters
                      ? html`<div class="active-filters">
                          <div>
                            <ha-icon icon="hass:filter-variant"></ha-icon>
                            <paper-tooltip animation-delay="0" position="left">
                              ${this.hass.localize(
                                "ui.panel.config.filtering.filtering_by"
                              )}
                              ${this.activeFilters.join(", ")}
                            </paper-tooltip>
                          </div>
                          <mwc-button @click=${this._clearFilter}
                            >${this.hass.localize(
                              "ui.panel.config.filtering.clear"
                            )}</mwc-button
                          >
                        </div>`
                      : ""}
                  </div>
                </slot>
              </div>
            `
          : ""}
        <ha-data-table
          .columns=${this.columns}
          .data=${this.data}
          .filter=${this.filter}
          .selectable=${this.selectable}
          .hasFab=${this.hasFab}
          .id=${this.id}
          .noDataText=${this.noDataText}
          .dir=${computeRTLDirection(this.hass)}
          .clickable=${this.clickable}
        >
          ${!this.narrow
            ? html`
                <div slot="header">
                  <slot name="header">
                    <div class="table-header">
                      <search-input
                        .filter=${this.filter}
                        no-label-float
                        no-underline
                        @value-changed=${this._handleSearchChange}
                        .label=${this.hass.localize(
                          "ui.components.data-table.search"
                        )}
                      >
                      </search-input>
                      ${this.activeFilters
                        ? html`<div class="active-filters">
                            ${this.hass.localize(
                              "ui.panel.config.filtering.filtering_by"
                            )}
                            ${this.activeFilters.join(", ")}
                            <mwc-button @click=${this._clearFilter}
                              >${this.hass.localize(
                                "ui.panel.config.filtering.clear"
                              )}</mwc-button
                            >
                          </div>`
                        : ""}
                    </div>
                  </slot>
                </div>
              `
            : html` <div slot="header"></div> `}
        </ha-data-table>
        <div slot="fab"><slot name="fab"></slot></div>
      </hass-tabs-subpage>
    `;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this.filter = ev.detail.value;
  }

  private _clearFilter() {
    navigate(this, window.location.pathname);
  }

  static get styles(): CSSResult {
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
      .table-header {
        border-bottom: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
        padding: 0 16px;
        display: flex;
        align-items: center;
      }
      .search-toolbar {
        display: flex;
        align-items: center;
        color: var(--secondary-text-color);
        padding: 0 16px;
      }
      search-input {
        position: relative;
        top: 2px;
        flex-grow: 1;
      }
      search-input.header {
        left: -8px;
      }
      .active-filters {
        color: var(--primary-text-color);
        position: relative;
        display: flex;
        align-items: center;
        padding: 2px 2px 2px 8px;
        margin-left: 4px;
        font-size: 14px;
      }
      .active-filters ha-icon {
        color: var(--primary-color);
      }
      .active-filters mwc-button {
        margin-left: 8px;
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
      .search-toolbar .active-filters {
        top: -8px;
        right: -16px;
      }
    `;
  }
}
