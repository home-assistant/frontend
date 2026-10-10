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
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { HASSDomTargetEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
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
import { subscribeIntegrationLog } from "../../../data/error_log";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { fileDownload } from "../../../util/file_download";
import type { LiveLogDialogParams } from "./show-dialog-live-log";

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\x1b\[[0-9;]*m/g;

// Stay close to the bottom to keep following new lines
const SCROLL_FOLLOW_MARGIN = 40;

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
class DialogLiveLog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LiveLogDialogParams;

  @state() private _open = false;

  @state() private _lineCount = 0;

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

  public showDialog(params: LiveLogDialogParams) {
    this._params = params;
    this._open = true;
    this._subscribe();
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._unsubscribe();
    this._params = undefined;
    this._lines = [];
    this._shownCount = 0;
    this._lastLevel = undefined;
    this._lineCount = 0;
    this._unsupported = false;
    this._live = false;
    this._newLogsIndicator = false;
    this._levels = new Set(LOG_LEVELS);
    this._search = "";
    this._paused = false;
    this._wrapLines = true;
    this._noMatches = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  private _subscribe() {
    this._unsub = subscribeIntegrationLog(
      this.hass,
      this._params!.domain,
      (lines) => this._addLines(lines)
    );
    this._unsub.then(
      () => {
        this._live = true;
      },
      () => {
        this._unsub = undefined;
        this._unsupported = true;
      }
    );
  }

  private _unsubscribe() {
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
    requestAnimationFrame(() => {
      if (this._logElement) {
        this._logElement.scrollTop = this._logElement.scrollHeight;
      }
    });
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
      .map((text) => ({ text, level: this._parseLevel(text) }));
    if (!newLines.length) {
      return;
    }
    this._lines.push(...newLines);
    this._lineCount = this._lines.length;
    if (!this._paused) {
      this._showNewLines();
    }
  }

  private _showNewLines() {
    const newLines = this._lines.slice(this._shownCount);
    if (!newLines.length) {
      return;
    }
    const follow = this._isScrolledToBottom();
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
    this._scrollToBottom();
  }, 150);

  private _togglePause() {
    this._paused = !this._paused;
    if (!this._paused) {
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
      `home-assistant_${this._params!.domain}_${timeString}.log`
    );
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.integrations.config_entry.live_log.title"
        )}
        header-subtitle=${this._params.name}
        width="large"
        flexcontent
        @closed=${this._dialogClosed}
      >
        ${
          this._unsupported
            ? html`<ha-alert alert-type="error">
                ${this.hass.localize(
                  "ui.panel.config.integrations.config_entry.live_log.unsupported"
                )}
              </ha-alert>`
            : html`<div class="toolbar">
                  <ha-input-search
                    appearance="outlined"
                    .value=${this._search}
                    .placeholder=${this.hass.localize(
                      "ui.panel.config.logs.search"
                    )}
                    @input=${this._searchChanged}
                  ></ha-input-search>
                  <ha-chip-set>
                    ${LOG_LEVELS.map(
                      (level) => html`
                        <ha-filter-chip
                          data-level=${level}
                          .selected=${this._levels.has(level)}
                          .label=${this.hass.localize(
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
                      .label=${this.hass.localize(
                        `ui.panel.config.integrations.config_entry.live_log.${this._paused ? "resume" : "pause"}`
                      )}
                      @click=${this._togglePause}
                    ></ha-icon-button>
                    <ha-icon-button
                      .path=${this._wrapLines ? mdiWrapDisabled : mdiWrap}
                      .label=${this.hass.localize(
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
                            ${this.hass.localize(
                              "ui.panel.config.integrations.config_entry.live_log.waiting",
                              { integration: this._params.name }
                            )}
                          </div>`
                    }
                    ${
                      this._noMatches
                        ? html`<div class="waiting">
                            ${this.hass.localize(
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
                    ${this.hass.localize("ui.panel.config.logs.scroll_down_button")}
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
                              ? this.hass.localize(
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
            ${this.hass.localize("ui.common.download")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this.hass.localize("ui.common.close")}
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
