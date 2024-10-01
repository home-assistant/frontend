import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { mdiArrowCollapseDown, mdiDownload } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { classMap } from "lit/directives/class-map";
import { customElement, property, state, query } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-alert";
import "../../../components/ha-ansi-to-html";
import "../../../components/ha-card";
import "../../../components/ha-button";
import "../../../components/ha-icon-button";
import "../../../components/ha-select";
import "../../../components/ha-svg-icon";

import { getSignedPath } from "../../../data/auth";

import { getErrorLogDownloadUrl } from "../../../data/error_log";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  fetchHassioLogsFollow,
  getHassioLogDownloadUrl,
} from "../../../data/hassio/supervisor";
import { HomeAssistant } from "../../../types";
import { fileDownload } from "../../../util/file_download";

@customElement("error-log-card")
class ErrorLogCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public filter = "";

  @property() public header?: string;

  @property() public provider!: string;

  @property({ type: Boolean, attribute: true }) public show = false;

  @query(".error-log") private _logElement?: HTMLElement;

  @query("#scroll-marker") private _scrollMarkerElement?: HTMLElement;

  @state() private _log?: string;

  @state() private _scrolledToBottom?: boolean;

  @state() private _scrolledToBottomObserver?: IntersectionObserver;

  @state() private _newLogsIndicator?: boolean;

  @state() private _error?: string;

  @state() private _logStreamAborter?: AbortController;

  protected render(): TemplateResult {
    return html`
      <div class="error-log-intro">
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        ${this._log
          ? html`
              <ha-card outlined>
                <div class="header">
                  <h1 class="card-header">
                    ${this.header ||
                    this.hass.localize("ui.panel.config.logs.show_full_logs")}
                  </h1>
                  <div>
                    <ha-icon-button
                      .path=${mdiDownload}
                      @click=${this._downloadFullLog}
                      .label=${this.hass.localize(
                        "ui.panel.config.logs.download_full_log"
                      )}
                    ></ha-icon-button>
                  </div>
                </div>
                <div class="card-content error-log">
                  <ha-ansi-to-html .content=${this._log}> </ha-ansi-to-html>
                  <div id="scroll-marker"></div>
                </div>
                <ha-button
                  class="new-logs-indicator ${classMap({
                    visible: this._newLogsIndicator || false,
                  })}"
                  @click=${this._scrollToBottom}
                >
                  <ha-svg-icon
                    .path=${mdiArrowCollapseDown}
                    slot="icon"
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.logs.scroll_down_button"
                  )}
                  <ha-svg-icon
                    .path=${mdiArrowCollapseDown}
                    slot="trailingIcon"
                  ></ha-svg-icon>
                </ha-button>
              </ha-card>
            `
          : ""}
        ${!this._log
          ? html`
              <mwc-button outlined @click=${this._downloadFullLog}>
                <ha-svg-icon .path=${mdiDownload}></ha-svg-icon>
                ${this.hass.localize("ui.panel.config.logs.download_full_log")}
              </mwc-button>
            `
          : ""}
      </div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    if (this.hass?.config.recovery_mode || this.show) {
      this.hass.loadFragmentTranslation("config");
      this._loadLogs();
    }
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("provider")) {
      this._log = undefined;
    }

    if (
      (changedProps.has("show") && this.show) ||
      (changedProps.has("provider") && this.show)
    ) {
      this._loadLogs();
    }

    if (
      this._scrollMarkerElement &&
      this._scrolledToBottomObserver === undefined
    ) {
      this._scrolledToBottomObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          this._scrolledToBottom = entry.isIntersecting;
        });
      });
      this._scrolledToBottomObserver.observe(this._scrollMarkerElement);
    } else if (!this._scrollMarkerElement && this._scrolledToBottomObserver) {
      this._scrolledToBottomObserver.disconnect();
      this._scrolledToBottomObserver = undefined;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this._logStreamAborter) {
      this._logStreamAborter.abort();
    }

    if (this._scrolledToBottomObserver) {
      this._scrolledToBottomObserver.disconnect();
    }
  }

  private async _downloadFullLog(): Promise<void> {
    const timeString = new Date().toISOString().replace(/:/g, "-");
    const downloadUrl =
      this.provider !== "core"
        ? getHassioLogDownloadUrl(this.provider)
        : getErrorLogDownloadUrl;
    const logFileName =
      this.provider !== "core"
        ? `${this.provider}_${timeString}.log`
        : `home-assistant_${timeString}.log`;
    const signedUrl = await getSignedPath(this.hass, downloadUrl);
    fileDownload(signedUrl.path, logFileName);
  }

  private async _loadLogs(): Promise<void> {
    this._log = this.hass.localize("ui.panel.config.logs.loading_log");

    if (this.provider !== "core" && isComponentLoaded(this.hass, "hassio")) {
      try {
        if (this._logStreamAborter) {
          this._logStreamAborter.abort();
        }

        this._logStreamAborter = new AbortController();

        const body = await fetchHassioLogsFollow(
          this.hass,
          this.provider,
          this._logStreamAborter.signal
        );

        const logChunks: string[] = [];

        if (!body) {
          throw new Error("No stream body found");
        }

        this._log = this.hass.localize("ui.panel.config.logs.no_errors");

        for await (const chunk of body) {
          const value = new TextDecoder().decode(chunk);
          logChunks.push(value);
          this._log = logChunks.join("");

          if (
            (this._scrolledToBottom || this._newLogsIndicator === undefined) &&
            this._logElement
          ) {
            this._scrollToBottom();
          } else {
            this._newLogsIndicator = true;
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          return;
        }
        this._error = this.hass.localize(
          "ui.panel.config.logs.failed_get_logs",
          { provider: this.provider, error: extractApiErrorMessage(err) }
        );
      }
    } else {
      // log = await fetchErrorLog(this.hass!);
    }
  }

  private _scrollToBottom(): void {
    if (this._logElement) {
      this._logElement.scrollTo(0, 999999);
      this._newLogsIndicator = false;
    }
  }

  static styles: CSSResultGroup = css`
    .error-log-intro {
      text-align: center;
      margin: 16px;
    }

    ha-card {
      padding-top: 16px;
      position: relative;
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
    }

    ha-select {
      display: block;
      max-width: 500px;
      width: 100%;
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

      min-height: calc(100vh - 240px);
      max-height: calc(100vh - 240px);
      overflow-y: scroll;

      border-top: 1px solid var(--divider-color);
    }

    @media all and (max-width: 870px) {
      .error-log {
        min-height: calc(100vh - 190px);
        max-height: calc(100vh - 190px);
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

    mwc-button {
      direction: var(--direction);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "error-log-card": ErrorLogCard;
  }
}
