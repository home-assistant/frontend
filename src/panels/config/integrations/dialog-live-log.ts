import type { ContextType } from "@lit/context";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import {
  mdiArrowCollapseDown,
  mdiCircle,
  mdiPause,
  mdiPlay,
  mdiWrap,
  mdiWrapDisabled,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomTargetEvent,
} from "../../../common/dom/fire_event";
import { consume } from "../../../common/decorators/consume";
import { debounce } from "../../../common/util/debounce";
import "../../../components/chips/ha-chip-set";
import "../../../components/chips/ha-filter-chip";
import "../../../components/ha-alert";
import "../../../components/ha-ansi-to-html";
import type { HaAnsiToHtml } from "../../../components/ha-ansi-to-html";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../components/input/ha-input-search";
import "../../../components/input/ha-input";
import type { HaInput } from "../../../components/input/ha-input";
import {
  connectionContext,
  internationalizationContext,
} from "../../../data/context";
import { subscribeIntegrationLog } from "../../../data/error_log";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { fileDownload } from "../../../util/file_download";
import type { LiveLogDialogParams } from "./show-dialog-live-log";

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\x1b\[[0-9;]*m/g;

// Stay close to the bottom to keep following new lines
const SCROLL_FOLLOW_MARGIN = 40;

const DEFAULT_LOG_LINE_LIMIT = 5000;

const LOG_LEVELS = ["debug", "info", "warning", "error"] as const;

type LogLevel = (typeof LOG_LEVELS)[number];

const LEVEL_PATTERN =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? (DEBUG|INFO|WARNING|ERROR|CRITICAL) /;

interface LogLine {
  text: string;
  // Lines before the first record have no level and are always shown
  level?: LogLevel;
}

@customElement("dialog-live-log")
class DialogLiveLog extends DialogMixin<LiveLogDialogParams>(LitElement) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @state() private _lineCount = 0;

  @state() private _lineLimit = DEFAULT_LOG_LINE_LIMIT;

  @state() private _unsupported = false;

  @state() private _live = false;

  @state() private _newLogsIndicator = false;

  @state() private _levels = new Set<LogLevel>(LOG_LEVELS);

  @state() private _search = "";

  @state() private _paused = false;

  @state() private _wrapLines = true;

  @state() private _noMatches = false;

  @query(".log") private _logElement?: HTMLElement;

  @query("ha-ansi-to-html") private _ansiToHtml?: HaAnsiToHtml;

  private _lines: LogLine[] = [];

  // Number of stored lines shown in the view, the rest is buffered while paused
  private _shownCount = 0;

  private _lastLevel?: LogLevel;

  private _unsub?: Promise<UnsubscribeFunc>;

  private _followFrame?: number;

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
    unsub.then(
      () => {
        if (this._unsub === unsub) {
          this._live = true;
        }
      },
      () => {
        if (this._unsub === unsub) {
          this._unsub = undefined;
          this._unsupported = true;
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
    if (!this._unsub) {
      return;
    }
    this._unsub = undefined;
    this._cancelFollowBottom();
    this._lines = [];
    this._shownCount = 0;
    this._lastLevel = undefined;
    this._lineCount = 0;
    this._newLogsIndicator = false;
    this._noMatches = false;
    this._ansiToHtml?.clear();
    this._subscribe();
  };

  private _unsubscribe() {
    this._cancelFollowBottom();
    this._debounceSearch.cancel();
    this._unsub?.then((unsub) => unsub());
    this._unsub = undefined;
    this._live = false;
  }

  private _isScrolledToBottom(): boolean {
    const log = this._logElement;
    return (
      !log ||
      log.scrollHeight - log.scrollTop - log.clientHeight < SCROLL_FOLLOW_MARGIN
    );
  }

  private _handleScroll() {
    if (this._newLogsIndicator && this._isScrolledToBottom()) {
      this._newLogsIndicator = false;
    }
  }

  private _scrollToBottom() {
    this._newLogsIndicator = false;
    this._logElement?.scrollTo(0, this._logElement.scrollHeight);
  }

  private _followBottom() {
    this._cancelFollowBottom();
    const logElement = this._logElement;
    const scrollTopBeforeFrame = logElement ? logElement.scrollTop : 0;
    this._followFrame = requestAnimationFrame(() => {
      this._followFrame = undefined;
      if (logElement && logElement.scrollTop === scrollTopBeforeFrame) {
        logElement.scrollTop = logElement.scrollHeight;
      }
    });
  }

  private _cancelFollowBottom() {
    if (this._followFrame !== undefined) {
      cancelAnimationFrame(this._followFrame);
      this._followFrame = undefined;
    }
  }

  private _lineLimitChanged(ev: HASSDomCurrentTargetEvent<HaInput>) {
    const input = ev.currentTarget;
    const value = input.value?.trim() ?? "";
    const limit = Number(value);
    input.invalid =
      !/^\d+$/.test(value) || !Number.isSafeInteger(limit) || limit < 1;
    if (input.invalid || limit === this._lineLimit) {
      return;
    }
    const follow = !this._paused && this._isScrolledToBottom();
    this._lineLimit = limit;
    this._trimLines();
    this._lineCount = this._lines.length;
    if (follow) {
      this._followBottom();
    }
  }

  private _parseLevel(text: string): LogLevel | undefined {
    const match = LEVEL_PATTERN.exec(text.replace(ANSI_ESCAPE, ""));
    if (match) {
      this._lastLevel =
        match[1] === "CRITICAL"
          ? "error"
          : (match[1].toLowerCase() as LogLevel);
    }
    // Continuation lines belong to the record before them
    return this._lastLevel;
  }

  private _addLines(lines: string[]) {
    const newLines = lines
      .flatMap((line) => line.split("\n"))
      .map((text) => ({ text, level: this._parseLevel(text) }))
      .slice(-this._lineLimit);
    if (!newLines.length) {
      return;
    }
    const follow = this._isScrolledToBottom();
    this._lines = this._lines.concat(newLines);
    this._trimLines();
    this._lineCount = this._lines.length;
    if (!this._paused) {
      this._showNewLines(follow);
    }
  }

  private _trimLines() {
    const excessLineCount = this._lines.length - this._lineLimit;
    if (excessLineCount <= 0) {
      return;
    }
    const logElement = this._logElement;
    const scrollTopBeforeTrimming = logElement ? logElement.scrollTop : 0;
    const scrollHeightBeforeTrimming = logElement ? logElement.scrollHeight : 0;

    this._lines.splice(0, excessLineCount);
    this._shownCount = Math.max(0, this._shownCount - excessLineCount);
    const renderedLineCount = this._lines
      .slice(0, this._shownCount)
      .filter((line) => !line.level || this._levels.has(line.level)).length;
    if (this._ansiToHtml) {
      this._ansiToHtml.trimLines(renderedLineCount);
      const hasMatches = this._ansiToHtml.filterLines(this._search);
      this._noMatches = this._shownCount > 0 && !hasMatches;
    }
    if (logElement) {
      const removedHeight =
        scrollHeightBeforeTrimming - logElement.scrollHeight;
      logElement.scrollTop = Math.max(
        0,
        scrollTopBeforeTrimming - removedHeight
      );
    }
  }

  private _showNewLines(follow = this._isScrolledToBottom()) {
    const newLines = this._lines.slice(this._shownCount);
    if (!newLines.length) {
      return;
    }
    this._shownCount = this._lines.length;
    this._renderLines(newLines);
    if (follow) {
      this._followBottom();
    } else {
      this._newLogsIndicator = true;
    }
  }

  private _renderLines(lines: LogLine[], reset = false) {
    const ansiToHtml = this._ansiToHtml;
    if (!ansiToHtml) {
      return;
    }
    if (reset) {
      ansiToHtml.clear();
    }
    // ha-ansi-to-html re-filters all lines after every added line while a
    // search is set, so search once after adding them
    ansiToHtml.filterLines("");
    ansiToHtml.parseLinesToColoredPre(
      lines
        .filter((line) => !line.level || this._levels.has(line.level))
        .map((line) => line.text)
    );
    this._noMatches =
      this._shownCount > 0 && !ansiToHtml.filterLines(this._search);
  }

  private _rerender() {
    this._renderLines(this._lines.slice(0, this._shownCount), true);
    this._scrollToBottom();
  }

  private _toggleLevel(ev: Event) {
    const level = (ev.currentTarget as HTMLElement).dataset.level as LogLevel;
    const levels = new Set(this._levels);
    if (levels.has(level)) {
      levels.delete(level);
    } else {
      levels.add(level);
    }
    this._levels = levels;
    this._rerender();
  }

  private _searchChanged(ev: HASSDomTargetEvent<HaInputSearch>) {
    this._search = ev.target.value ?? "";
    this._debounceSearch();
  }

  private _debounceSearch = debounce(() => {
    if (this._ansiToHtml) {
      this._noMatches =
        this._shownCount > 0 && !this._ansiToHtml.filterLines(this._search);
    }
    if (!this._search) {
      this._scrollToBottom();
    }
  }, 150);

  private _togglePause() {
    this._paused = !this._paused;
    if (this._paused) {
      this._cancelFollowBottom();
    } else {
      this._showNewLines();
    }
  }

  private _toggleLineWrap() {
    this._wrapLines = !this._wrapLines;
  }

  private _download() {
    const text = this._lines
      .map((line) => line.text)
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
    return html`
      <ha-dialog
        open
        header-title=${this._i18n.localize(
          "ui.panel.config.integrations.config_entry.live_log.title"
        )}
        header-subtitle=${this.params.name}
        width="large"
        flexcontent
      >
        ${
          this._unsupported
            ? html`<ha-alert alert-type="error">
                ${this._i18n.localize(
                  "ui.panel.config.integrations.config_entry.live_log.unsupported"
                )}
              </ha-alert>`
            : html`<div class="toolbar">
                  <ha-input-search
                    appearance="outlined"
                    .value=${this._search}
                    .placeholder=${this._i18n.localize(
                      "ui.panel.config.logs.search"
                    )}
                    @input=${this._searchChanged}
                  ></ha-input-search>
                  <ha-input
                    class="line-limit"
                    type="number"
                    appearance="outlined"
                    .min=${1}
                    .step=${1}
                    .value=${String(this._lineLimit)}
                    .validationMessage=${this._i18n.localize(
                      "ui.panel.config.integrations.config_entry.live_log.invalid_line_limit"
                    )}
                    @change=${this._lineLimitChanged}
                  >
                    <span slot="label" class="line-limit-label">
                      ${this._i18n.localize(
                        "ui.panel.config.integrations.config_entry.live_log.lines"
                      )}
                    </span>
                    <span slot="start" aria-hidden="true">
                      ${this._i18n.localize(
                        "ui.panel.config.integrations.config_entry.live_log.lines"
                      )}
                    </span>
                  </ha-input>
                  <ha-chip-set>
                    ${LOG_LEVELS.map(
                      (level) => html`
                        <ha-filter-chip
                          data-level=${level}
                          .selected=${this._levels.has(level)}
                          .label=${this._i18n.localize(
                            `ui.panel.config.logs.level.${level}`
                          )}
                          @click=${this._toggleLevel}
                        ></ha-filter-chip>
                      `
                    )}
                  </ha-chip-set>
                  <div class="toolbar-buttons">
                    <ha-icon-button
                      .path=${this._paused ? mdiPlay : mdiPause}
                      .label=${this._i18n.localize(
                        `ui.panel.config.integrations.config_entry.live_log.${this._paused ? "resume" : "pause"}`
                      )}
                      @click=${this._togglePause}
                    ></ha-icon-button>
                    <ha-icon-button
                      .path=${this._wrapLines ? mdiWrapDisabled : mdiWrap}
                      .label=${this._i18n.localize(
                        `ui.panel.config.logs.${this._wrapLines ? "full_width" : "wrap_lines"}`
                      )}
                      @click=${this._toggleLineWrap}
                    ></ha-icon-button>
                  </div>
                </div>
                <div class="log-container">
                  <div class="log" @scroll=${this._handleScroll}>
                    ${
                      this._lineCount
                        ? nothing
                        : html`<div class="waiting">
                            ${this._i18n.localize(
                              "ui.panel.config.integrations.config_entry.live_log.waiting",
                              { integration: this.params.name }
                            )}
                          </div>`
                    }
                    ${
                      this._noMatches
                        ? html`<div class="waiting">
                            ${this._i18n.localize(
                              "ui.panel.config.integrations.config_entry.live_log.no_matches"
                            )}
                          </div>`
                        : nothing
                    }
                    <ha-ansi-to-html
                      ?wrap-disabled=${!this._wrapLines}
                    ></ha-ansi-to-html>
                  </div>
                  <ha-button
                    class="new-logs-indicator ${classMap({
                      visible: this._newLogsIndicator,
                    })}"
                    size="s"
                    appearance="filled"
                    @click=${this._scrollToBottom}
                  >
                    <ha-svg-icon
                      .path=${mdiArrowCollapseDown}
                      slot="start"
                    ></ha-svg-icon>
                    ${this._i18n.localize("ui.panel.config.logs.scroll_down_button")}
                    <ha-svg-icon
                      .path=${mdiArrowCollapseDown}
                      slot="end"
                    ></ha-svg-icon>
                  </ha-button>
                  ${
                    this._live
                      ? html`<div class="live-indicator">
                          ${
                            this._paused
                              ? this._i18n.localize(
                                  "ui.panel.config.integrations.config_entry.live_log.paused"
                                )
                              : html`<ha-svg-icon
                                    .path=${mdiCircle}
                                  ></ha-svg-icon>
                                  Live`
                          }
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
        .line-limit {
          flex: 0 0 140px;
          min-width: 0;
        }
        .line-limit::part(wa-base) {
          height: 40px;
        }
        .line-limit [slot="start"] {
          color: var(--secondary-text-color);
        }
        .line-limit-label {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
        }
        .toolbar-buttons {
          display: flex;
          margin-inline-start: auto;
        }
        .log-container {
          position: relative;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
        .log {
          /* Fills the dialog when it is full screen on narrow screens */
          flex: 1 1 60vh;
          min-height: 0;
          padding-bottom: var(--ha-space-8);
          box-sizing: border-box;
          overflow: auto;
          overflow-anchor: none;
          direction: ltr;
          font-family: var(--ha-font-family-code);
          font-size: var(--ha-font-size-s);
        }
        .new-logs-indicator {
          overflow: hidden;
          position: absolute;
          bottom: 4px;
          inset-inline-start: 4px;
          height: 0;
          transition: height 0.4s ease-out;
        }
        .new-logs-indicator.visible {
          height: 32px;
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
