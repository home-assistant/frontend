import { mdiFilterVariantRemove } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-filter-states";
import "../../../components/ha-icon-button";
import "../../../components/ha-list";
import "../../../components/ha-list-item";
import "../../../components/ha-spinner";
import { getSignedPath } from "../../../data/auth";
import { getErrorLogDownloadUrl } from "../../../data/error_log";
import { domainToName } from "../../../data/integration";
import type { LoggedError, SystemLogErrorType } from "../../../data/system_log";
import {
  fetchSystemLog,
  getLoggedErrorIntegration,
  isCustomIntegrationError,
} from "../../../data/system_log";
import type { HomeAssistant } from "../../../types";
import { fileDownload } from "../../../util/file_download";
import { showSystemLogDetailDialog } from "./show-dialog-system-log-detail";
import { formatSystemLogTime } from "./util";

@customElement("system-log-card")
export class SystemLogCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public filter = "";

  @property({ type: Boolean, attribute: "show-filters" })
  public showFilters = false;

  @state() private _items?: LoggedError[];

  @state() private _levelFilter: string[] = [];

  @state() private _errorTypeFilter: (SystemLogErrorType | "unknown")[] = [];

  public async fetchData(): Promise<void> {
    this._items = undefined;
    this._items = await fetchSystemLog(this.hass);
  }

  public async clearLogs(): Promise<void> {
    await this.hass.callService("system_log", "clear");
    this._items = [];
  }

  public async downloadLogs(): Promise<void> {
    const timeString = new Date().toISOString().replace(/:/g, "-");
    const downloadUrl = getErrorLogDownloadUrl(this.hass);
    const logFileName = `home-assistant_${timeString}.log`;
    const signedUrl = await getSignedPath(this.hass, downloadUrl);
    fileDownload(signedUrl.path, logFileName);
  }

  public get activeFiltersCount(): number {
    return this._levelFilter.length + this._errorTypeFilter.length;
  }

  public get hasItems(): boolean {
    return (this._items?.length || 0) > 0;
  }

  private _timestamp(item: LoggedError): string {
    return formatSystemLogTime(
      item.timestamp,
      this.hass.locale,
      this.hass.config
    );
  }

  private _multipleMessages(item: LoggedError): string {
    return this.hass.localize("ui.panel.config.logs.multiple_messages", {
      time: formatSystemLogTime(
        item.first_occurred,
        this.hass.locale,
        this.hass.config
      ),
      counter: item.count,
    });
  }

  private _getFilteredItems = memoizeOne(
    (
      localize: LocalizeFunc,
      items: LoggedError[],
      filter: string,
      levelFilter: string[],
      errorTypeFilter: (SystemLogErrorType | "unknown")[]
    ) =>
      items.filter((item: LoggedError) => {
        if (levelFilter.length && !levelFilter.includes(item.level)) {
          return false;
        }

        if (errorTypeFilter.length) {
          const matchesKnown =
            item.error_type !== undefined &&
            errorTypeFilter.includes(item.error_type);
          const matchesUnknown =
            item.error_type === undefined &&
            errorTypeFilter.includes("unknown");
          if (!matchesKnown && !matchesUnknown) {
            return false;
          }
        }

        if (filter) {
          const integration = getLoggedErrorIntegration(item);
          return (
            item.message.some((message: string) =>
              message.toLowerCase().includes(filter)
            ) ||
            item.source[0].toLowerCase().includes(filter) ||
            item.name.toLowerCase().includes(filter) ||
            (item.error_type &&
              (item.error_type.includes(filter) ||
                this.hass
                  .localize(
                    `ui.panel.config.logs.error_type.${item.error_type}`
                  )
                  .toLowerCase()
                  .includes(filter))) ||
            (integration &&
              domainToName(localize, integration)
                .toLowerCase()
                .includes(filter)) ||
            this._timestamp(item).toLowerCase().includes(filter) ||
            this._multipleMessages(item).toLowerCase().includes(filter)
          );
        }

        return item;
      })
  );

  protected render() {
    if (this._items === undefined) {
      return html`
        <div class="loading-container">
          <ha-spinner></ha-spinner>
        </div>
      `;
    }

    const filteredItems = this._getFilteredItems(
      this.hass.localize,
      this._items,
      this.filter.toLowerCase(),
      this._levelFilter,
      this._errorTypeFilter
    );

    const levels = [...new Set(this._items.map((item) => item.level))];
    const errorTypes = [
      ...new Set(
        this._items
          .map((item) => item.error_type)
          .filter((type): type is SystemLogErrorType => Boolean(type))
      ),
    ];

    const integrations = filteredItems.length
      ? filteredItems.map((item) => getLoggedErrorIntegration(item))
      : [];

    const hasActiveFilters = this.activeFiltersCount > 0;

    const listContent =
      this._items.length === 0
        ? html`
            <div class="card-content empty-content">
              ${this.hass.localize("ui.panel.config.logs.no_issues")}
            </div>
          `
        : filteredItems.length === 0 && (this.filter || hasActiveFilters)
          ? html`
              <div class="card-content">
                ${this.filter
                  ? this.hass.localize(
                      "ui.panel.config.logs.no_issues_search",
                      {
                        term: this.filter,
                      }
                    )
                  : this.hass.localize("ui.panel.config.logs.no_issues")}
              </div>
            `
          : html`
              <div class="list-wrapper">
                <ha-list>
                  ${filteredItems.map(
                    (item, idx) => html`
                      <ha-list-item
                        @click=${this._openLog}
                        .logItem=${item}
                        twoline
                      >
                        ${item.message[0]}
                        <span slot="secondary" class="secondary">
                          ${this._timestamp(item)} –
                          ${html`(<span class=${item.level}
                              >${this.hass.localize(
                                `ui.panel.config.logs.level.${item.level}`
                              )}</span
                            >) `}
                          ${item.error_type
                            ? html`(<span class="error-type-text"
                                  >${this.hass.localize(
                                    `ui.panel.config.logs.error_type.${item.error_type}`
                                  )}</span
                                >) `
                            : nothing}
                          ${integrations[idx]
                            ? `${domainToName(
                                this.hass.localize,
                                integrations[idx]!
                              )}${
                                isCustomIntegrationError(item)
                                  ? ` (${this.hass.localize(
                                      "ui.panel.config.logs.custom_integration"
                                    )})`
                                  : ""
                              }`
                            : item.source[0]}
                          ${item.count > 1
                            ? html` - ${this._multipleMessages(item)} `
                            : nothing}
                        </span>
                      </ha-list-item>
                    `
                  )}
                </ha-list>
              </div>
            `;

    return this.showFilters
      ? html`
          <div class="content-layout">
            <div class="pane">
              <div class="pane-header">
                <ha-icon-button
                  .path=${mdiFilterVariantRemove}
                  .label=${this.hass.localize(
                    "ui.components.subpage-data-table.clear_filter"
                  )}
                  .disabled=${!hasActiveFilters}
                  @click=${this._clearFilters}
                ></ha-icon-button>
              </div>

              <div class="pane-content">
                <ha-filter-states
                  .hass=${this.hass}
                  .label=${this.hass.localize(
                    "ui.panel.config.logs.level_filter"
                  )}
                  .states=${levels.map((level) => ({
                    value: level,
                    label: this.hass.localize(
                      `ui.panel.config.logs.level.${level}`
                    ),
                  }))}
                  .value=${this._levelFilter}
                  @data-table-filter-changed=${this._levelFilterChanged}
                ></ha-filter-states>
                <ha-filter-states
                  .hass=${this.hass}
                  .label=${this.hass.localize(
                    "ui.panel.config.logs.classification"
                  )}
                  .states=${[
                    ...errorTypes.map((errorType) => ({
                      value: errorType,
                      label: this.hass.localize(
                        `ui.panel.config.logs.error_type.${errorType}`
                      ),
                    })),
                    {
                      value: "unknown",
                      label: this.hass.localize("ui.panel.config.logs.other"),
                    },
                  ]}
                  .value=${this._errorTypeFilter}
                  @data-table-filter-changed=${this._errorTypeFilterChanged}
                ></ha-filter-states>
              </div>
            </div>

            <div class="content-main">${listContent}</div>
          </div>
        `
      : listContent;
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    this.fetchData();
    this._notifyFiltersState();
  }

  private _levelFilterChanged(ev): void {
    this._levelFilter = ev.detail.value || [];
    this._notifyFiltersState();
  }

  private _errorTypeFilterChanged(ev): void {
    this._errorTypeFilter = ev.detail.value || [];
    this._notifyFiltersState();
  }

  private _clearFilters(ev: Event): void {
    ev.stopPropagation();
    this._levelFilter = [];
    this._errorTypeFilter = [];
    this._notifyFiltersState();
  }

  private _notifyFiltersState(): void {
    this.dispatchEvent(
      new CustomEvent("system-log-filters-changed", {
        detail: {
          open: this.showFilters,
          count: this.activeFiltersCount,
        },
      })
    );
  }

  private _openLog(ev: Event): void {
    const item = (ev.currentTarget as any).logItem;
    showSystemLogDetailDialog(this, { item });
  }

  static styles = css`
    :host {
      display: block;
      direction: var(--direction);
      min-height: 0;
      height: 100%;
      background: var(--primary-background-color);
    }

    ha-list {
      direction: ltr;
      background: var(--card-background-color);
    }

    .loading-container {
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .content-layout {
      display: flex;
      min-height: 100%;
      height: 100%;
    }

    .content-main {
      flex: 1;
      min-width: 0;
      background: var(--card-background-color);
    }

    .list-wrapper {
      border-top: 1px solid var(--divider-color);
      min-height: 100%;
      background: var(--card-background-color);
    }

    .pane {
      width: min(320px, 45%);
      border-inline-end: 1px solid var(--divider-color);
      display: flex;
      flex-direction: column;
      min-height: 0;
      border-top: 1px solid var(--divider-color);
      background: var(--primary-background-color);
    }

    .pane-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 8px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--primary-background-color);
    }

    .pane-content {
      overflow: auto;
      background: var(--primary-background-color);
    }

    .error {
      color: var(--error-color);
    }

    .warning {
      color: var(--warning-color);
    }

    .error-type-text {
      color: var(--secondary-text-color);
    }

    .card-content {
      border-top: 1px solid var(--divider-color);
      padding-top: 16px;
      padding-bottom: 16px;
      min-height: 100%;
      background: var(--card-background-color);
    }

    .row-secondary {
      text-align: left;
    }

    @media (max-width: 900px) {
      .content-layout {
        flex-direction: column;
      }

      .pane {
        width: 100%;
        border-inline-end: none;
        border-top: 1px solid var(--divider-color);
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "system-log-card": SystemLogCard;
  }
}
