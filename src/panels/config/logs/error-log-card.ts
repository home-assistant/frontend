import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { mdiDownload } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-alert";
import "../../../components/ha-ansi-to-html";
import "../../../components/ha-card";
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

  @state() private _logChunks?: string[];

  @state() private _log?: string;

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
                  <span id="scroll-anchor"></span>
                </div>
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
      this._refreshLogs();
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
      this._refreshLogs();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this._logStreamAborter) {
      this._logStreamAborter.abort();
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

  private async _refreshLogs(): Promise<void> {
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

        this._logChunks = [];

        if (!body) {
          throw new Error("No stream body found");
        }

        this._log = this.hass.localize("ui.panel.config.logs.no_errors");

        for await (const chunk of body) {
          let scrolledToBottom = true;
          if (this._logElement) {
            scrolledToBottom =
              this._logElement.scrollHeight - this._logElement.scrollTop ===
              this._logElement.clientHeight;
          }

          const value = new TextDecoder().decode(chunk);
          this._logChunks.push(value);
          this._log = this._logChunks.join("");

          if (scrolledToBottom && this._logElement) {
            window.requestAnimationFrame(() => {
              this._logElement!.scrollTo(0, 999999);
            });
          } else {
            // TODO show an indicator that there are new logs
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

  static styles: CSSResultGroup = css`
    .error-log-intro {
      text-align: center;
      margin: 16px;
    }

    ha-card {
      padding-top: 16px;
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
      font-family: var(--code-font-family, monospace);
      clear: both;
      text-align: left;
      padding-top: 12px;
      padding-bottom: 12px;

      min-height: calc(100vh - 240px);
      max-height: calc(100vh - 240px);
      overflow: auto;

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
