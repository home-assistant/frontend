import "@material/mwc-list/mwc-list-item";
import { mdiArrowCollapseDown, mdiDownload, mdiMenuDown } from "@mdi/js";
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

import { getErrorLogDownloadUrl } from "../../../data/error_log";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  fetchHassioLogsFollow,
  getHassioLogDownloadUrl,
} from "../../../data/hassio/supervisor";
import { HomeAssistant } from "../../../types";
import { fileDownload } from "../../../util/file_download";
import type { HaMenu } from "../../../components/ha-menu";

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

  protected render(): TemplateResult {
    let filteredLines = this._logHTML;

    if (Array.isArray(this._logHTML) && this._logHTML.length && this.filter) {
      filteredLines = this._logHTML.filter((_line, key) =>
        this._logs[key]
          .toLocaleLowerCase()
          .includes(this.filter.toLocaleLowerCase())
      );
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
              <ha-assist-chip
                .label=${this.hass.localize("ui.panel.config.logs.nr_of_lines")}
                id="nr-of-lines-anchor"
                @click=${this._toggleNumberOfLinesMenu}
              >
                <ha-svg-icon
                  slot="trailing-icon"
                  .path=${mdiMenuDown}
                ></ha-svg-icon
              ></ha-assist-chip>
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

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    this._scrolledToBottomController.observe(this._scrollMarkerElement!);

    if (this.hass?.config.recovery_mode || this.show) {
      this.hass.loadFragmentTranslation("config");
      this._loadLogs();
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
            (line) => html`<ha-ansi-to-html .content=${line}></ha-ansi-to-html>`
          ),
        ];

        if (scrolledToBottom && this._logElement) {
          this._scrollToBottom();
        } else {
          this._newLogsIndicator = true;
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

  static styles: CSSResultGroup = css`
    .error-log-intro {
      text-align: center;
      margin: 16px;
    }

    ha-card {
      padding-top: 16px;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "error-log-card": ErrorLogCard;
  }
}
