import "@material/mwc-list/mwc-list-item";
import {
  mdiArrowCollapseDown,
  mdiDownload,
  mdiMenuDown,
  mdiRefresh,
} from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  nothing,
} from "lit";
import { classMap } from "lit/directives/class-map";

// eslint-disable-next-line import/extensions
import { IntersectionController } from "@lit-labs/observers/intersection-controller.js";
import { customElement, property, state, query } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-ansi-to-html";
import "../../../components/ha-card";
import "../../../components/ha-button";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/chips/ha-assist-chip";
import "../../../components/ha-menu";
import "../../../components/ha-md-menu-item";

import { getSignedPath } from "../../../data/auth";

import { fetchErrorLog, getErrorLogDownloadUrl } from "../../../data/error_log";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  fetchHassioLogs,
  fetchHassioLogsFollow,
  getHassioLogDownloadUrl,
} from "../../../data/hassio/supervisor";
import { HomeAssistant } from "../../../types";
import { fileDownload } from "../../../util/file_download";
import type { HaMenu } from "../../../components/ha-menu";
import { HASSDomEvent } from "../../../common/dom/fire_event";
import { ConnectionStatus } from "../../../data/connection-status";
import { atLeastVersion } from "../../../common/config/version";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";

const NUMBER_OF_LINES_OPTIONS = [100, 500, 1000, 5000, 10000];

@customElement("error-log-card")
class ErrorLogCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public filter = "";

  @property() public header?: string;

  @property() public provider!: string;

  @property({ type: Boolean, attribute: true }) public show = false;

  @query(".error-log") private _logElement?: HTMLElement;

  @query("#scroll-marker") private _scrollMarkerElement?: HTMLElement;

  @query("#nr-of-lines-menu") private _nrOfLinesMenuElement?: HaMenu;

  @state() private _logs: string[] = [];

  @state() private _logHTML?: string | TemplateResult[];

  @state() private _scrolledToBottomController =
    new IntersectionController<boolean>(this, {
      callback(this: IntersectionController<boolean>, entries) {
        return entries[0].isIntersecting;
      },
    });

  @state() private _newLogsIndicator?: boolean;

  @state() private _numberOfLines = NUMBER_OF_LINES_OPTIONS[0];

  @state() private _error?: string;

  @state() private _logStreamAborter?: AbortController;

  @state() private _streamSupported?: boolean;

  protected render(): TemplateResult {
    let filteredLines = this._logHTML;

    if (Array.isArray(this._logHTML) && this._logHTML.length && this.filter) {
      filteredLines = this._logHTML.filter((_line, key) =>
        this._logs[key]
          .toLocaleLowerCase()
          .includes(this.filter.toLocaleLowerCase())
      );
      this._highlightSearch();
    } else {
      this._clearSearchHighlight();
    }

    return html`
      <div class="error-log-intro">
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        <ha-card
          outlined
          class=${classMap({ hidden: this._logHTML === undefined })}
        >
          <div class="header">
            <h1 class="card-header">
              ${this.header ||
              this.hass.localize("ui.panel.config.logs.show_full_logs")}
            </h1>
            <div class="action-buttons">
              ${this._streamSupported
                ? html`<ha-assist-chip
                    .label=${this.hass.localize(
                      "ui.panel.config.logs.nr_of_lines"
                    )}
                    id="nr-of-lines-anchor"
                    @click=${this._toggleNumberOfLinesMenu}
                  >
                    <ha-svg-icon
                      slot="trailing-icon"
                      .path=${mdiMenuDown}
                    ></ha-svg-icon
                  ></ha-assist-chip>`
                : nothing}
              <ha-menu
                anchor="nr-of-lines-anchor"
                id="nr-of-lines-menu"
                positioning="fixed"
              >
                ${NUMBER_OF_LINES_OPTIONS.map(
                  (number) => html`
                    <ha-md-menu-item
                      .value=${number}
                      .selected=${number === this._numberOfLines}
                      @click=${this._setNumberOfLines}
                    >
                      ${number}
                    </ha-md-menu-item>
                  `
                )}
              </ha-menu>
              <ha-icon-button
                .path=${mdiDownload}
                @click=${this._downloadFullLog}
                .label=${this.hass.localize(
                  "ui.panel.config.logs.download_full_log"
                )}
              ></ha-icon-button>
              ${!this._streamSupported || this._error
                ? html`<ha-icon-button
                    .path=${mdiRefresh}
                    @click=${this._loadLogs}
                    .label=${this.hass.localize("ui.common.refresh")}
                  ></ha-icon-button>`
                : nothing}
            </div>
          </div>
          <div class="card-content error-log">
            ${filteredLines}
            ${!filteredLines
              ? html`
                  <div>
                    ${this.hass.localize(
                      this.filter
                        ? "ui.panel.config.logs.no_issues_search"
                        : "ui.panel.config.logs.no_errors",
                      { term: this.filter }
                    )}
                  </div>
                `
              : nothing}
            <div id="scroll-marker"></div>
          </div>
          <ha-button
            class="new-logs-indicator ${classMap({
              visible:
                (this._newLogsIndicator &&
                  !this._scrolledToBottomController.value) ||
                false,
            })}"
            @click=${this._scrollToBottom}
          >
            <ha-svg-icon
              .path=${mdiArrowCollapseDown}
              slot="icon"
            ></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.logs.scroll_down_button")}
            <ha-svg-icon
              .path=${mdiArrowCollapseDown}
              slot="trailingIcon"
            ></ha-svg-icon>
          </ha-button>
        </ha-card>
        ${!filteredLines
          ? html`
              <ha-button outlined @click=${this._downloadFullLog}>
                <ha-svg-icon .path=${mdiDownload}></ha-svg-icon>
                ${this.hass.localize("ui.panel.config.logs.download_full_log")}
              </ha-button>
              <mwc-button raised @click=${this._loadLogs}>
                ${this.hass.localize("ui.panel.config.logs.load_logs")}
              </mwc-button>
            `
          : ""}
      </div>
    `;
  }

  public connectedCallback() {
    super.connectedCallback();

    if (this._streamSupported === undefined) {
      this._streamSupported = atLeastVersion(
        this.hass.config.version,
        2024,
        11
      );
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    this._scrolledToBottomController.observe(this._scrollMarkerElement!);

    window.addEventListener("connection-status", this._handleConnectionStatus);

    if (this.hass?.config.recovery_mode || this.show) {
      this.hass.loadFragmentTranslation("config");
    }
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("provider")) {
      this._logHTML = undefined;
    }

    if (
      (changedProps.has("show") && this.show) ||
      (changedProps.has("provider") && this.show)
    ) {
      this._loadLogs();
    }

    if (this._newLogsIndicator && this._scrolledToBottomController.value) {
      this._newLogsIndicator = false;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this._logStreamAborter) {
      this._logStreamAborter.abort();
    }

    window.removeEventListener(
      "connection-status",
      this._handleConnectionStatus
    );
  }

  private async _downloadFullLog(): Promise<void> {
    const timeString = new Date().toISOString().replace(/:/g, "-");
    const downloadUrl =
      this.provider && this.provider !== "core"
        ? getHassioLogDownloadUrl(this.provider)
        : getErrorLogDownloadUrl;
    const logFileName =
      this.provider && this.provider !== "core"
        ? `${this.provider}_${timeString}.log`
        : `home-assistant_${timeString}.log`;
    const signedUrl = await getSignedPath(this.hass, downloadUrl);
    fileDownload(signedUrl.path, logFileName);
  }

  private _setNumberOfLines(ev: any): void {
    if (ev?.target?.value && ev.target.value !== this._numberOfLines) {
      this._numberOfLines = ev.target.value;
      this._loadLogs();
    }
  }

  private async _loadLogs(): Promise<void> {
    this._error = undefined;
    this._logHTML = this.hass.localize("ui.panel.config.logs.loading_log");

    try {
      if (this._logStreamAborter) {
        this._logStreamAborter.abort();
      }

      this._logStreamAborter = new AbortController();

      if (
        this._streamSupported &&
        isComponentLoaded(this.hass, "hassio") &&
        this.provider
      ) {
        const body = await fetchHassioLogsFollow(
          this.hass,
          this.provider,
          this._logStreamAborter.signal,
          this._numberOfLines
        );

        if (!body) {
          throw new Error("No stream body found");
        }

        this._logHTML = this.hass.localize("ui.panel.config.logs.no_errors");
        this._logs = [];

        for await (const chunk of body) {
          const value = new TextDecoder().decode(chunk);
          if (!Array.isArray(this._logHTML)) {
            this._logHTML = [];
          }
          const scrolledToBottom = this._scrolledToBottomController.value;
          const lines = value.split("\n");
          this._logs.push(...lines);

          this._logHTML = [
            ...this._logHTML,
            ...lines.map(
              (line) =>
                html`<ha-ansi-to-html .content=${line}></ha-ansi-to-html>`
            ),
          ];

          if (scrolledToBottom && this._logElement) {
            this._scrollToBottom();
          } else {
            this._newLogsIndicator = true;
          }
        }
      } else {
        // fallback to old method
        this._streamSupported = false;
        let logs = "";
        if (isComponentLoaded(this.hass, "hassio") && this.provider) {
          logs = await fetchHassioLogs(this.hass, this.provider);
        } else {
          logs = await fetchErrorLog(this.hass);
        }

        this._logs = logs.split("\n");
        this._logHTML = this._logs.map(
          (line) => html`<ha-ansi-to-html .content=${line}></ha-ansi-to-html>`
        );
        this._scrollToBottom();
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return;
      }
      this._error = this.hass.localize("ui.panel.config.logs.failed_get_logs", {
        provider: this.provider,
        error: extractApiErrorMessage(err),
      });
    }
  }

  private _scrollToBottom(): void {
    if (this._logElement) {
      window.requestAnimationFrame(() => {
        this._logElement!.scrollTo(0, 999999);
      });
      this._newLogsIndicator = false;
    }
  }

  private _toggleNumberOfLinesMenu() {
    if (this._nrOfLinesMenuElement) {
      this._nrOfLinesMenuElement.open = !this._nrOfLinesMenuElement.open;
    }
  }

  private _handleConnectionStatus = (ev: HASSDomEvent<ConnectionStatus>) => {
    if (ev.detail === "disconnected" && this._logStreamAborter) {
      this._logStreamAborter.abort();
    }
    if (ev.detail === "connected" && this.show) {
      this._loadLogs();
    }
  };

  private async _highlightSearch() {
    if (CSS.highlights) {
      await this.updateComplete;
      if (this.filter && Array.isArray(this._logHTML) && this._logHTML.length) {
        const ansiToHtmlElements =
          this.shadowRoot?.querySelectorAll("ha-ansi-to-html");
        const allSpans: HTMLSpanElement[] = [];
        if (ansiToHtmlElements) {
          for (const haAnsiToHtmlElement of ansiToHtmlElements) {
            const spanElement =
              haAnsiToHtmlElement.shadowRoot?.querySelector("span");
            if (spanElement) {
              allSpans.push(spanElement);
            }
          }
          const filter = this.filter.toLowerCase();

          const ranges = allSpans
            .map((el) => ({ el, text: el.textContent?.toLowerCase() || "" }))
            .map(({ text, el }) => {
              if (el.firstChild === null) {
                return null;
              }
              const indices: number[] = [];
              let startPos = 0;
              while (startPos < text.length) {
                const index = text.indexOf(filter, startPos);
                if (index === -1) break;
                indices.push(index);
                startPos = index + filter.length;
              }

              return indices.map((index) => {
                const range = new Range();
                range.setStart(el.firstChild!, index);
                range.setEnd(el.firstChild!, index + filter.length);
                return range;
              });
            })
            .flat()
            .filter((range) => range !== null);

          const searchResultsHighlight = new Highlight(...ranges);
          window.requestAnimationFrame(() => {
            CSS.highlights.set("search-results", searchResultsHighlight);
          });
        }
      }
    }
  }

  private _clearSearchHighlight() {
    if (CSS.highlights) {
      CSS.highlights.delete("search-results");
    }
  }

  static styles: CSSResultGroup = css`
    .error-log-intro {
      text-align: center;
      margin: 16px;
    }

    ha-card {
      padding-top: 8px;
      position: relative;
    }

    ha-card.hidden {
      display: none;
    }

    ha-card .action-buttons {
      display: flex;
      align-items: center;
      height: 100%;
    }

    .header {
      display: flex;
      justify-content: space-between;
      padding: 0 16px;
    }

    .card-header {
      color: var(--ha-card-header-color, --primary-text-color);
      font-family: var(--ha-card-header-font-family, inherit);
      font-size: var(--ha-card-header-font-size, 24px);
      letter-spacing: -0.012em;
      line-height: 48px;
      display: block;
      margin-block-start: 0px;
      font-weight: normal;
      white-space: nowrap;
      max-width: calc(100% - 150px);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    ha-icon-button {
      float: right;
    }

    .error-log {
      position: relative;
      font-family: var(--code-font-family, monospace);
      clear: both;
      text-align: left;
      padding-top: 12px;
      padding-bottom: 12px;
      overflow-y: scroll;
      min-height: var(--error-log-card-height, calc(100vh - 240px));
      max-height: var(--error-log-card-height, calc(100vh - 240px));

      border-top: 1px solid var(--divider-color);
    }

    @media all and (max-width: 870px) {
      .error-log {
        min-height: var(--error-log-card-height, calc(100vh - 190px));
        max-height: var(--error-log-card-height, calc(100vh - 190px));
      }
    }

    .error-log > div {
      overflow: auto;
      overflow-wrap: break-word;
    }

    .error-log > div:hover {
      background-color: var(--secondary-background-color);
    }

    .error-log #scroll-marker {
      height: 1px; /* Small height to act as a scroll marker */
    }

    .new-logs-indicator {
      --mdc-theme-primary: var(--text-primary-color);

      overflow: hidden;
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 0;
      background-color: var(--primary-color);
      border-radius: 8px;

      transition: height 0.4s ease-out;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .new-logs-indicator.visible {
      height: 24px;
    }

    .error {
      color: var(--error-color);
    }

    .warning {
      color: var(--warning-color);
    }

    ::highlight(search-results) {
      background-color: var(--primary-color);
      border-radius: 4px;
      color: var(--text-primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "error-log-card": ErrorLogCard;
  }
}
