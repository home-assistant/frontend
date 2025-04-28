import { mdiDotsVertical, mdiDownload, mdiRefresh, mdiText } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/buttons/ha-progress-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-list";
import "../../../components/ha-list-item";
import "../../../components/ha-spinner";
import { getSignedPath } from "../../../data/auth";
import { getErrorLogDownloadUrl } from "../../../data/error_log";
import { domainToName } from "../../../data/integration";
import type { LoggedError } from "../../../data/system_log";
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

  @property() public header?: string;

  public loaded = false;

  @state() private _items?: LoggedError[];

  public async fetchData(): Promise<void> {
    this._items = undefined;
    this._items = await fetchSystemLog(this.hass!);
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
    (localize: LocalizeFunc, items: LoggedError[], filter: string) =>
      items.filter((item: LoggedError) => {
        if (filter) {
          const integration = getLoggedErrorIntegration(item);
          return (
            item.message.some((message: string) =>
              message.toLowerCase().includes(filter)
            ) ||
            item.source[0].toLowerCase().includes(filter) ||
            item.name.toLowerCase().includes(filter) ||
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
    const filteredItems = this._items
      ? this._getFilteredItems(
          this.hass.localize,
          this._items,
          this.filter.toLowerCase()
        )
      : [];
    const integrations = filteredItems.length
      ? filteredItems.map((item) => getLoggedErrorIntegration(item))
      : [];
    return html`
      <div class="system-log-intro">
        <ha-card outlined>
          ${this._items === undefined
            ? html`
                <div class="loading-container">
                  <ha-spinner></ha-spinner>
                </div>
              `
            : html`
                <div class="header">
                  <h1 class="card-header">${this.header || "Logs"}</h1>
                  <div class="header-buttons">
                    <ha-icon-button
                      .path=${mdiDownload}
                      @click=${this._downloadLogs}
                      .label=${this.hass.localize(
                        "ui.panel.config.logs.download_logs"
                      )}
                    ></ha-icon-button>
                    <ha-icon-button
                      .path=${mdiRefresh}
                      @click=${this.fetchData}
                      .label=${this.hass.localize("ui.common.refresh")}
                    ></ha-icon-button>

                    <ha-button-menu @action=${this._handleOverflowAction}>
                      <ha-icon-button slot="trigger" .path=${mdiDotsVertical}>
                      </ha-icon-button>
                      <ha-list-item graphic="icon">
                        <ha-svg-icon
                          slot="graphic"
                          .path=${mdiText}
                        ></ha-svg-icon>
                        ${this.hass.localize(
                          "ui.panel.config.logs.show_full_logs"
                        )}
                      </ha-list-item>
                    </ha-button-menu>
                  </div>
                </div>
                ${this._items.length === 0
                  ? html`
                      <div class="card-content empty-content">
                        ${this.hass.localize("ui.panel.config.logs.no_issues")}
                      </div>
                    `
                  : filteredItems.length === 0 && this.filter
                    ? html`<div class="card-content">
                        ${this.hass.localize(
                          "ui.panel.config.logs.no_issues_search",
                          { term: this.filter }
                        )}
                      </div>`
                    : html`<ha-list
                        >${filteredItems.map(
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
                                ${integrations[idx]
                                  ? `${domainToName(
                                      this.hass!.localize,
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
                        )}</ha-list
                      >`}

                <div class="card-actions">
                  <ha-call-service-button
                    .hass=${this.hass}
                    domain="system_log"
                    service="clear"
                    >${this.hass.localize(
                      "ui.panel.config.logs.clear"
                    )}</ha-call-service-button
                  >
                </div>
              `}
        </ha-card>
      </div>
    `;
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    this.fetchData();
    this.loaded = true;
    this.addEventListener("hass-service-called", (ev) =>
      this.serviceCalled(ev)
    );
  }

  protected serviceCalled(ev): void {
    // Check if this is for us
    if (ev.detail.success && ev.detail.domain === "system_log") {
      // Do the right thing depending on service
      if (ev.detail.service === "clear") {
        this._items = [];
      }
    }
  }

  private _handleOverflowAction() {
    // @ts-ignore
    fireEvent(this, "switch-log-view");
  }

  private async _downloadLogs() {
    const timeString = new Date().toISOString().replace(/:/g, "-");
    const downloadUrl = getErrorLogDownloadUrl;
    const logFileName = `home-assistant_${timeString}.log`;
    const signedUrl = await getSignedPath(this.hass, downloadUrl);
    fileDownload(signedUrl.path, logFileName);
  }

  private _openLog(ev: Event): void {
    const item = (ev.currentTarget as any).logItem;
    showSystemLogDetailDialog(this, { item });
  }

  static styles = css`
    ha-card {
      padding-top: 8px;
    }

    :host {
      direction: var(--direction);
    }
    ha-list {
      direction: ltr;
    }

    .header {
      display: flex;
      justify-content: space-between;
      padding: 0 16px;
    }

    .header-buttons {
      display: flex;
      align-items: flex-start;
    }

    .card-header {
      color: var(--ha-card-header-color, var(--primary-text-color));
      font-family: var(--ha-card-header-font-family, inherit);
      font-size: var(--ha-card-header-font-size, var(--ha-font-size-2xl));
      letter-spacing: -0.012em;
      line-height: var(--ha-line-height-expanded);
      display: block;
      margin-block-start: 0px;
      font-weight: var(--ha-font-weight-normal);
    }

    .system-log-intro {
      margin: 16px;
    }

    .loading-container {
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .error {
      color: var(--error-color);
    }

    .warning {
      color: var(--warning-color);
    }

    .card-content {
      border-top: 1px solid var(--divider-color);
      padding-top: 16px;
      padding-bottom: 16px;
    }

    .row-secondary {
      text-align: left;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "system-log-card": SystemLogCard;
  }
}
