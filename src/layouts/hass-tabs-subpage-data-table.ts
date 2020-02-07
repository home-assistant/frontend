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
import "../components/data-table/ha-data-table";
// tslint:disable-next-line
import {
  HaDataTable,
  DataTableColumnContainer,
  DataTableRowData,
} from "../components/data-table/ha-data-table";
import "./hass-tabs-subpage";
import { HomeAssistant, Route } from "../types";
// tslint:disable-next-line
import { PageNavigation } from "./hass-tabs-subpage";

@customElement("hass-tabs-subpage-data-table")
export class HaTabsSubpageDataTable extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;
  @property({ type: Boolean, reflect: true }) public narrow!: boolean;
  @property({ type: Object }) public columns: DataTableColumnContainer = {};
  @property({ type: Array }) public data: DataTableRowData[] = [];
  @property({ type: Boolean }) public selectable = false;
  @property({ type: String }) public id = "id";
  @property({ type: String }) public filter = "";
  @property({ type: String, attribute: "back-path" }) public backPath?: string;
  @property() public backCallback?: () => void;
  @property() public route!: Route;
  @property() public tabs!: PageNavigation[];
  @query("ha-data-table") private _dataTable!: HaDataTable;

  public clearSelection() {
    this._dataTable.clearSelection();
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this.backPath}
        .backCallback=${this.backCallback}
        .route=${this.route}
        .tabs=${this.tabs}
      >
        ${this.narrow
          ? html`
              <div slot="header">
                <slot name="header">
                  <div class="search-toolbar">
                    <search-input
                      no-label-float
                      no-underline
                      @value-changed=${this._handleSearchChange}
                    ></search-input>
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
          .id=${this.id}
        >
          ${!this.narrow
            ? html`
                <div slot="header">
                  <slot name="header">
                    <slot name="header">
                      <div class="table-header">
                        <search-input
                          no-label-float
                          no-underline
                          @value-changed=${this._handleSearchChange}
                        ></search-input></div></slot
                  ></slot>
                </div>
              `
            : html`
                <div slot="header"></div>
              `}
        </ha-data-table>
      </hass-tabs-subpage>
    `;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this.filter = ev.detail.value;
  }

  static get styles(): CSSResult {
    return css`
      ha-data-table {
        width: 100%;
        --data-table-border-width: 0;
      }
      :host(:not([narrow])) ha-data-table {
        height: calc(100vh - 65px);
        display: block;
      }
      .table-header {
        border-bottom: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
      }
      .search-toolbar {
        margin-left: -24px;
        color: var(--secondary-text-color);
      }
      search-input {
        position: relative;
        top: 2px;
      }
    `;
  }
}
