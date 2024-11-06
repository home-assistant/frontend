import "@material/mwc-list/mwc-list-item";
import type { ActionDetail } from "@material/mwc-list";

import {
  mdiArrowCollapseDown,
  mdiDotsVertical,
  mdiCircle,
  mdiDownload,
  mdiFormatListNumbered,
  mdiMenuDown,
  mdiRefresh,
  mdiWrap,
  mdiWrapDisabled,
} from "@mdi/js";
import {
  css,
  type CSSResultGroup,
  html,
  LitElement,
  type PropertyValues,
  type TemplateResult,
  nothing,
} from "lit";
import { classMap } from "lit/directives/class-map";

// eslint-disable-next-line import/extensions
import { IntersectionController } from "@lit-labs/observers/intersection-controller.js";
import { customElement, property, state, query } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-ansi-to-html";
import type { HaAnsiToHtml } from "../../../components/ha-ansi-to-html";
import "../../../components/ha-card";
import "../../../components/ha-button";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-circular-progress";
import "../../../components/chips/ha-assist-chip";
import "../../../components/ha-menu";
import "../../../components/ha-md-menu-item";
import "../../../components/ha-md-divider";
import "../../../components/ha-button-menu";
import "../../../components/ha-list-item";

import { getSignedPath } from "../../../data/auth";

import { fetchErrorLog, getErrorLogDownloadUrl } from "../../../data/error_log";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  fetchHassioBoots,
  fetchHassioLogs,
  fetchHassioLogsFollow,
  getHassioLogDownloadLinesUrl,
  getHassioLogDownloadUrl,
} from "../../../data/hassio/supervisor";
import type { HomeAssistant } from "../../../types";
import {
  downloadFileSupported,
  fileDownload,
} from "../../../util/file_download";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { ConnectionStatus } from "../../../data/connection-status";
import { atLeastVersion } from "../../../common/config/version";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { debounce } from "../../../common/util/debounce";
import { showDownloadLogsDialog } from "./show-dialog-download-logs";
import type { HaMenu } from "../../../components/ha-menu";

const NUMBER_OF_LINES = 100;

@customElement("error-log-card")
class ErrorLogCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public filter = "";

  @property() public header?: string;

  @property() public provider!: string;

  @property({ type: Boolean, attribute: true }) public show = false;

  @query(".error-log") private _logElement?: HTMLElement;

  @query("#scroll-top-marker") private _scrollTopMarkerElement?: HTMLElement;

  @query("#scroll-bottom-marker")
  private _scrollBottomMarkerElement?: HTMLElement;

  @query("ha-ansi-to-html") private _ansiToHtmlElement?: HaAnsiToHtml;

  @query("#boots-menu") private _bootsMenu?: HaMenu;

  @state() private _firstCursor?: string;

  @state() private _scrolledToBottomController =
    new IntersectionController<boolean>(this, {
      callback(this: IntersectionController<boolean>, entries) {
        return entries[0].isIntersecting;
      },
    });

  @state() private _scrolledToTopController =
    new IntersectionController<boolean>(this, {});

  @state() private _newLogsIndicator?: boolean;

  @state() private _error?: string;

  @state() private _logStreamAborter?: AbortController;

  @state() private _streamSupported?: boolean;

  @state() private _loadingState: "loading" | "empty" | "loaded" = "loading";

  @state() private _loadingPrevState?: "loading" | "end" | "loaded";

  @state() private _noSearchResults: boolean = false;

  @state() private _numberOfLines?: number;

  @state() private _boot = 0;

  @state() private _boots?: number[];

  @state() private _showBootsSelect = false;

  @state() private _wrapLines = true;

  @state() private _downloadSupported;

  @state() private _logsFileLink;

  protected render(): TemplateResult {
    return html`
      <div class="error-log-intro">
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <ha-card outlined class=${classMap({ hidden: this.show === false })}>
          <div class="header">
            <h1 class="card-header">
              ${this.header ||
              this.hass.localize("ui.panel.config.logs.show_full_logs")}
            </h1>
            <div class="action-buttons">
              ${this._streamSupported &&
              Array.isArray(this._boots) &&
              this._showBootsSelect
                ? html`
                    <ha-assist-chip
                      .title=${this.hass.localize(
                        "ui.panel.config.logs.haos_boots_title"
                      )}
                      .label=${this._boot === 0
                        ? this.hass.localize("ui.panel.config.logs.current")
                        : this._boot === -1
                          ? this.hass.localize("ui.panel.config.logs.previous")
                          : this.hass.localize(
                              "ui.panel.config.logs.startups_ago",
                              { boot: this._boot * -1 }
                            )}
                      id="boots-anchor"
                      @click=${this._toggleBootsMenu}
                    >
                      <ha-svg-icon
                        slot="trailing-icon"
                        .path=${mdiMenuDown}
                      ></ha-svg-icon
                    ></ha-assist-chip>
                    <ha-menu
                      anchor="boots-anchor"
                      id="boots-menu"
                      positioning="fixed"
                    >
                      ${this._boots.map(
                        (boot) => html`
                          <ha-md-menu-item
                            .value=${boot}
                            @click=${this._setBoot}
                            .selected=${boot === this._boot}
                          >
                            ${boot === 0
                              ? this.hass.localize(
                                  "ui.panel.config.logs.current"
                                )
                              : boot === -1
                                ? this.hass.localize(
                                    "ui.panel.config.logs.previous"
                                  )
                                : this.hass.localize(
                                    "ui.panel.config.logs.startups_ago",
                                    { boot: boot * -1 }
                                  )}
                          </ha-md-menu-item>
                          ${boot === 0
                            ? html`<ha-md-divider
                                role="separator"
                              ></ha-md-divider>`
                            : nothing}
                        `
                      )}
                    </ha-menu>
                  `
                : nothing}
              ${this._downloadSupported
                ? html`
                    <ha-icon-button
                      .path=${mdiDownload}
                      @click=${this._downloadLogs}
                      .label=${this.hass.localize(
                        "ui.panel.config.logs.download_logs"
                      )}
                    ></ha-icon-button>
                  `
                : this._logsFileLink
                  ? html`
                      <a
                        href=${this._logsFileLink}
                        target="_blank"
                        class="download-link"
                      >
                        <ha-icon-button
                          .path=${mdiDownload}
                          .label=${this.hass.localize(
                            "ui.panel.config.logs.download_logs"
                          )}
                        ></ha-icon-button>
                      </a>
                    `
                  : nothing}
              <ha-icon-button
                .path=${this._wrapLines ? mdiWrapDisabled : mdiWrap}
                @click=${this._toggleLineWrap}
                .label=${this.hass.localize(
                  `ui.panel.config.logs.${this._wrapLines ? "full_width" : "wrap_lines"}`
                )}
              ></ha-icon-button>
              ${!this._streamSupported || this._error
                ? html`<ha-icon-button
                    .path=${mdiRefresh}
                    @click=${this._loadLogs}
                    .label=${this.hass.localize("ui.common.refresh")}
                  ></ha-icon-button>`
                : nothing}
              <ha-button-menu @action=${this._handleOverflowAction}>
                <ha-icon-button slot="trigger" .path=${mdiDotsVertical}>
                </ha-icon-button>
                <ha-list-item graphic="icon">
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiFormatListNumbered}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    `ui.panel.config.logs.${this._showBootsSelect ? "hide" : "show"}_haos_boots`
                  )}
                </ha-list-item>
              </ha-button-menu>
            </div>
          </div>
          <div class="card-content error-log">
            <div id="scroll-top-marker"></div>
            ${this._loadingPrevState === "loading"
              ? html`<div class="loading-old">
                  <ha-circular-progress
                    .indeterminate=${this._loadingPrevState === "loading"}
                  ></ha-circular-progress>
                </div>`
              : nothing}
            ${this._loadingState === "loading"
              ? html`<div>
                  ${this.hass.localize("ui.panel.config.logs.loading_log")}
                </div>`
              : this._loadingState === "empty"
                ? html`<div>
                    ${this.hass.localize("ui.panel.config.logs.no_errors")}
                  </div>`
                : nothing}
            ${this._loadingState === "loaded" &&
            this.filter &&
            this._noSearchResults
              ? html`<div>
                  ${this.hass.localize(
                    "ui.panel.config.logs.no_issues_search",
                    { term: this.filter }
                  )}
                </div>`
              : nothing}
            <ha-ansi-to-html
              ?wrap-disabled=${!this._wrapLines}
            ></ha-ansi-to-html>
            <div id="scroll-bottom-marker"></div>
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
          ${this._streamSupported &&
          this._loadingState !== "loading" &&
          !this._error
            ? html`<div class="live-indicator">
                <ha-svg-icon path=${mdiCircle}></ha-svg-icon>
                Live
              </div>`
            : nothing}
        </ha-card>
        ${this.show === false
          ? html`
              ${this._downloadSupported
                ? html`
                    <ha-button outlined @click=${this._downloadLogs}>
                      <ha-svg-icon .path=${mdiDownload}></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.panel.config.logs.download_logs"
                      )}
                    </ha-button>
                  `
                : nothing}
              <mwc-button raised @click=${this._showLogs}>
                ${this.hass.localize("ui.panel.config.logs.load_logs")}
              </mwc-button>
            `
          : nothing}
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
    if (this._downloadSupported === undefined && this.hass) {
      this._downloadSupported = downloadFileSupported(this.hass);
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    this._scrolledToBottomController.observe(this._scrollBottomMarkerElement!);

    this._scrolledToTopController.callback = this._handleTopScroll;
    this._scrolledToTopController.observe(this._scrollTopMarkerElement!);

    window.addEventListener("connection-status", this._handleConnectionStatus);

    if (this.hass?.config.recovery_mode || this.show) {
      this.hass.loadFragmentTranslation("config");
    }

    // just needs to be loaded once, because only the host endpoints provide boots information
    this._loadBoots();
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (
      (changedProps.has("show") && this.show) ||
      (changedProps.has("provider") && this.show)
    ) {
      this._boot = 0;
      this._loadLogs();
    }

    if (this._newLogsIndicator && this._scrolledToBottomController.value) {
      this._newLogsIndicator = false;
    }

    if (changedProps.has("filter")) {
      this._debounceSearch();
    }

    if (
      changedProps.has("_loadingState") &&
      this._loadingState === "loaded" &&
      this._scrolledToTopController.value &&
      this._firstCursor &&
      !this._loadingPrevState
    ) {
      this._loadMoreLogs();
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

  private async _downloadLogs(): Promise<void> {
    if (this._streamSupported) {
      showDownloadLogsDialog(this, {
        header: this.header,
        provider: this.provider,
        defaultLineCount: this._numberOfLines,
        boot: this._boot,
      });
    } else {
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
  }

  private _showLogs(): void {
    this.show = true;
  }

  private async _loadLogs(): Promise<void> {
    this._error = undefined;
    this._loadingState = "loading";
    this._loadingPrevState = undefined;
    this._firstCursor = undefined;
    this._numberOfLines = 0;
    this._ansiToHtmlElement?.clear();

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
        // check if there are any logs at all
        const testResponse = await fetchHassioLogs(
          this.hass,
          this.provider,
          `entries=:-1:`,
          this._boot
        );
        const testLogs = await testResponse.text();
        if (!testLogs.trim()) {
          this._loadingState = "empty";
        }

        const response = await fetchHassioLogsFollow(
          this.hass,
          this.provider,
          this._logStreamAborter.signal,
          NUMBER_OF_LINES,
          this._boot
        );

        if (response.headers.has("X-First-Cursor")) {
          this._firstCursor = response.headers.get("X-First-Cursor")!;
        }

        if (!response.body) {
          throw new Error("No stream body found");
        }

        this._loadingState = "empty";

        let tempLogLine = "";

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
          // eslint-disable-next-line no-await-in-loop
          const { value, done: readerDone } = await reader.read();
          done = readerDone;

          if (value) {
            const chunk = decoder.decode(value, { stream: !done });
            const scrolledToBottom = this._scrolledToBottomController.value;
            const lines = `${tempLogLine}${chunk}`
              .split("\n")
              .filter((line) => line.trim() !== "");

            // handle edge case where the last line is not complete
            if (chunk.endsWith("\n")) {
              tempLogLine = "";
            } else {
              tempLogLine = lines.splice(-1, 1)[0];
            }

            if (lines.length) {
              this._ansiToHtmlElement?.parseLinesToColoredPre(lines);
              this._numberOfLines += lines.length;

              if (this._loadingState === "empty") {
                // delay to avoid loading older logs immediately
                setTimeout(() => {
                  this._loadingState = "loaded";
                }, 100);
              }
            }

            if (scrolledToBottom && this._logElement) {
              this._scrollToBottom();
            } else {
              this._newLogsIndicator = true;
            }

            if (!this._downloadSupported) {
              const downloadUrl = getHassioLogDownloadLinesUrl(
                this.provider,
                this._numberOfLines,
                this._boot
              );
              getSignedPath(this.hass, downloadUrl).then((signedUrl) => {
                this._logsFileLink = signedUrl.path;
              });
            }
          }
        }
      } else {
        // fallback to old method
        this._streamSupported = false;
        let logs = "";
        if (isComponentLoaded(this.hass, "hassio") && this.provider) {
          const repsonse = await fetchHassioLogs(this.hass, this.provider);
          logs = await repsonse.text();
        } else {
          logs = await fetchErrorLog(this.hass);
        }

        if (logs) {
          this._ansiToHtmlElement?.parseTextToColoredPre(logs);
          this._loadingState = "loaded";
          this._scrollToBottom();
        }
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

  private _debounceSearch = debounce(() => {
    this._noSearchResults = !this._ansiToHtmlElement?.filterLines(this.filter);

    if (!this.filter) {
      this._scrollToBottom();
    }
  }, 150);

  private _debounceScrollToBottom = debounce(() => {
    this._logElement!.scrollTop = this._logElement!.scrollHeight;
  }, 300);

  private _scrollToBottom(): void {
    if (this._logElement) {
      this._newLogsIndicator = false;
      if (this.provider !== "core") {
        this._logElement!.scrollTo(0, this._logElement!.scrollHeight);
      } else {
        this._debounceScrollToBottom();
      }
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

  private async _loadMoreLogs() {
    if (
      this._firstCursor &&
      this._loadingPrevState !== "loading" &&
      this._loadingState === "loaded" &&
      this._logElement
    ) {
      const scrolledToBottom = this._scrolledToBottomController.value;
      const scrollPositionFromBottom =
        this._logElement.scrollHeight - this._logElement.scrollTop;
      this._loadingPrevState = "loading";
      const response = await fetchHassioLogs(
        this.hass,
        this.provider,
        `entries=${this._firstCursor}:-100:100`,
        this._boot
      );

      if (response.headers.has("X-First-Cursor")) {
        if (this._firstCursor === response.headers.get("X-First-Cursor")!) {
          this._loadingPrevState = "end";
          return;
        }
        this._firstCursor = response.headers.get("X-First-Cursor")!;
      }

      const body = await response.text();

      if (body) {
        const lines = body
          .split("\n")
          .filter((line) => line.trim() !== "")
          .reverse();

        this._ansiToHtmlElement?.parseLinesToColoredPre(lines, true);
        this._numberOfLines! += lines.length;
        this._loadingPrevState = "loaded";
      } else {
        this._loadingPrevState = "end";
      }

      if (scrolledToBottom) {
        this._scrollToBottom();
      } else if (this._loadingPrevState !== "end" && this._logElement) {
        window.requestAnimationFrame(() => {
          this._logElement!.scrollTop =
            this._logElement!.scrollHeight - scrollPositionFromBottom;
        });
      }
    }
  }

  private _handleTopScroll = (entries) => {
    const isVisible = entries[0].isIntersecting;
    if (
      this._firstCursor &&
      isVisible &&
      this._loadingState === "loaded" &&
      (!this._loadingPrevState || this._loadingPrevState === "loaded") &&
      !this.filter
    ) {
      this._loadMoreLogs();
    }
    return isVisible;
  };

  private async _loadBoots() {
    if (this._streamSupported && isComponentLoaded(this.hass, "hassio")) {
      try {
        const { data } = await fetchHassioBoots(this.hass);
        const boots = Object.keys(data.boots)
          .map(Number)
          .sort((a, b) => b - a);

        // only show boots select when there are more than one boot
        if (boots.length > 1) {
          this._boots = boots;
        }
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }
  }

  private _toggleLineWrap() {
    this._wrapLines = !this._wrapLines;
  }

  private _handleOverflowAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._showBootsSelect = !this._showBootsSelect;
        break;
    }
  }

  private _toggleBootsMenu() {
    if (this._bootsMenu) {
      this._bootsMenu.open = !this._bootsMenu.open;
    }
  }

  private _setBoot(ev: any) {
    this._boot = ev.target.value;
    this._loadLogs();
  }

  static styles: CSSResultGroup = css`
    :host {
      direction: var(--direction);
    }
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
      color: var(--ha-card-header-color, var(--primary-text-color));
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
      text-align: start;
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

    .loading-old {
      display: flex;
      width: 100%;
      justify-content: center;
      padding: 16px;
    }

    ha-assist-chip {
      --ha-assist-chip-container-shape: 10px;
      --md-assist-chip-trailing-space: 8px;
    }

    @keyframes breathe {
      from {
        opacity: 0.8;
      }
      to {
        opacity: 0;
      }
    }

    .live-indicator {
      position: absolute;
      bottom: 0;
      inset-inline-end: 16px;
      border-top-right-radius: 8px;
      border-top-left-radius: 8px;
      background-color: var(--primary-color);
      color: var(--text-primary-color);
      padding: 4px 8px;
      opacity: 0.8;
    }
    .live-indicator ha-svg-icon {
      animation: breathe 1s cubic-bezier(0.5, 0, 1, 1) infinite alternate;
      height: 14px;
      width: 14px;
    }

    .download-link {
      color: var(--text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "error-log-card": ErrorLogCard;
  }
}
