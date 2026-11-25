import type { ContextType } from "@lit/context";
import {
  ERR_CONNECTION_LOST,
  type UnsubscribeFunc,
} from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { mdiCircle, mdiWrap, mdiWrapDisabled } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, query, state } from "lit/decorators";
import type { HASSDomTargetEvent } from "../../../common/dom/fire_event";
import { consume } from "../../../common/decorators/consume";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-icon-button";
import "../../../components/ha-log-viewer";
import type { HaLogViewer } from "../../../components/ha-log-viewer";
import "../../../components/ha-svg-icon";
import "../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../components/input/ha-input-search";
import "../../../components/skeleton/ha-skeleton-log";
import {
  connectionContext,
  internationalizationContext,
} from "../../../data/context";
import { subscribeIntegrationLog } from "../../../data/error_log";
import { ERR_UNKNOWN_COMMAND } from "../../../data/websocket_api";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { fileDownload } from "../../../util/file_download";
import type { LiveLogDialogParams } from "./show-dialog-live-log";

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\x1b\[[0-9;]*m/g;

@customElement("dialog-live-log")
class DialogLiveLog extends DialogMixin<LiveLogDialogParams>(LitElement) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @state() private _lineCount = 0;

  @state() private _unsupported = false;

  @state() private _error?: string;

  @state() private _live = false;

  // The backend answers the subscription once it has read the backlog
  @state() private _loading = false;

  @state() private _search = "";

  @state() private _wrapLines = true;

  @query("ha-log-viewer") private _logViewer?: HaLogViewer;

  private _unsub?: Promise<UnsubscribeFunc>;

  private _resubscribeOnReady = false;

  connectedCallback() {
    super.connectedCallback();
    const connection = this._connection.connection;
    connection.addEventListener("ready", this._handleConnectionReady);
    connection.addEventListener("disconnected", this._handleDisconnected);
    this._subscribe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const connection = this._connection.connection;
    connection.removeEventListener("ready", this._handleConnectionReady);
    connection.removeEventListener("disconnected", this._handleDisconnected);
    this._unsubscribe();
  }

  private _subscribe() {
    const unsub = subscribeIntegrationLog(
      this._connection.connection,
      this.params!.domain,
      (lines) => this._addLines(lines)
    );
    this._unsub = unsub;
    this._loading = true;
    unsub.then(
      () => {
        if (this._unsub === unsub) {
          this._loading = false;
          this._live = true;
        }
      },
      (err) => {
        if (this._unsub !== unsub) {
          return;
        }
        this._unsub = undefined;
        this._loading = false;
        if (err?.code === ERR_UNKNOWN_COMMAND) {
          this._unsupported = true;
        } else if (
          err === ERR_CONNECTION_LOST ||
          err?.error?.code === ERR_CONNECTION_LOST
        ) {
          this._resubscribeOnReady = true;
        } else {
          this._error = err?.message ?? String(err);
        }
      }
    );
  }

  private _handleDisconnected = () => {
    this._live = false;
  };

  private _handleConnectionReady = () => {
    // The subscription died with the connection and the backend sends the
    // backlog again, so start over instead of appending duplicates
    if (!this._unsub && !this._resubscribeOnReady) {
      return;
    }
    this._unsub = undefined;
    this._resubscribeOnReady = false;
    this._lineCount = 0;
    this._logViewer?.clear();
    this._subscribe();
  };

  private _unsubscribe() {
    // _subscribe reports subscription errors, so only ignore them here
    this._unsub?.then((unsub) => unsub()).catch(() => undefined);
    this._unsub = undefined;
    this._loading = false;
    this._live = false;
  }

  private _addLines(lines: string[]) {
    const logViewer = this._logViewer;
    if (!logViewer) {
      return;
    }
    logViewer.addLines(lines);
    this._lineCount = logViewer.lines.length;
  }

  private _searchChanged(ev: HASSDomTargetEvent<HaInputSearch>) {
    this._search = ev.target.value ?? "";
  }

  private _toggleLineWrap() {
    this._wrapLines = !this._wrapLines;
  }

  private _download() {
    const text = (this._logViewer?.lines ?? [])
      .join("\n")
      .replace(ANSI_ESCAPE, "");
    const timeString = new Date().toISOString().replace(/:/g, "-");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    fileDownload(
      url,
      `home-assistant_${this.params!.domain}_${timeString}.log`
    );
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }
    const error = this._unsupported
      ? this._i18n.localize(
          "ui.panel.config.integrations.config_entry.live_log.unsupported"
        )
      : this._error;
    return html`
      <ha-dialog
        open
        header-title=${this._i18n.localize(
          "ui.panel.config.integrations.config_entry.live_log.title"
        )}
        header-subtitle=${this.params.name}
        width="full"
        flexcontent
      >
        ${
          error
            ? html`<ha-alert alert-type="error">${error}</ha-alert>`
            : html`<div class="toolbar">
                  <ha-input-search
                    appearance="outlined"
                    .value=${this._search}
                    .placeholder=${this._i18n.localize(
                      "ui.panel.config.logs.search"
                    )}
                    @input=${this._searchChanged}
                  ></ha-input-search>
                  <ha-icon-button
                    .path=${this._wrapLines ? mdiWrapDisabled : mdiWrap}
                    .label=${this._i18n.localize(
                      `ui.panel.config.logs.${this._wrapLines ? "full_width" : "wrap_lines"}`
                    )}
                    @click=${this._toggleLineWrap}
                  ></ha-icon-button>
                </div>
                <div class="log-container">
                  <ha-log-viewer
                    .filter=${this._search}
                    ?wrap-disabled=${!this._wrapLines}
                  >
                    ${
                      this._lineCount
                        ? nothing
                        : this._loading
                          ? html`<ha-skeleton-log
                              .label=${this._i18n.localize(
                                "ui.panel.config.logs.loading_log"
                              )}
                            ></ha-skeleton-log>`
                          : html`<div class="waiting">
                              ${this._i18n.localize(
                                "ui.panel.config.integrations.config_entry.live_log.waiting",
                                { integration: this.params.name }
                              )}
                            </div>`
                    }
                  </ha-log-viewer>
                  ${
                    this._live
                      ? html`<div class="live-indicator">
                          <ha-svg-icon .path=${mdiCircle}></ha-svg-icon>
                          ${this._i18n.localize("ui.panel.config.logs.live")}
                        </div>`
                      : nothing
                  }
                </div>`
        }
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            .disabled=${!this._lineCount}
            @click=${this._download}
          >
            ${this._i18n.localize("ui.common.download")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this._i18n.localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--ha-space-2);
          padding-bottom: var(--ha-space-2);
        }
        .toolbar ha-input-search {
          flex: 1 1 200px;
        }
        .log-container {
          position: relative;
          display: flex;
          flex-direction: column;
          /* Fills the dialog when it is full screen on narrow screens */
          flex: 1 1 60vh;
          min-height: 0;
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
        @media (prefers-reduced-motion: reduce) {
          .live-indicator ha-svg-icon {
            animation: none;
          }
        }
        .waiting {
          color: var(--secondary-text-color);
          padding: var(--ha-space-2);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-live-log": DialogLiveLog;
  }
}
