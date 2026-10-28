import type { ContextType } from "@lit/context";
import { mdiArrowCollapseDown } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consume } from "../common/decorators/consume";
import { debounce } from "../common/util/debounce";
import { internationalizationContext } from "../data/context";
import "./ha-ansi-to-html";
import type { HaAnsiToHtml } from "./ha-ansi-to-html";
import "./ha-button";
import "./ha-svg-icon";

const SCROLL_FOLLOW_MARGIN = 40;

@customElement("ha-log-viewer")
export class HaLogViewer extends LitElement {
  @property({ type: Number, attribute: "max-lines" }) public maxLines = 5000;

  @property() public filter = "";

  @property({ type: Boolean, attribute: "wrap-disabled" }) public wrapDisabled =
    false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state() private _newLogsIndicator = false;

  @state() private _noMatches = false;

  @query(".log") private _logElement!: HTMLElement;

  @query("ha-ansi-to-html") private _ansiToHtml!: HaAnsiToHtml;

  private _lines: string[] = [];

  private _followFrame?: number;

  private _ready = false;

  public get lines(): string[] {
    return this._lines;
  }

  public addLines(lines: string[]) {
    const newLines = lines
      .flatMap((line) => line.split("\n"))
      .slice(-this.maxLines);
    if (!newLines.length) {
      return;
    }
    const overflow = this._lines.length + newLines.length > this.maxLines;
    this._lines = this._lines.concat(newLines).slice(-this.maxLines);
    if (!this._ready) {
      return;
    }
    const follow = this._isScrolledToBottom();
    if (overflow) {
      this._trimLines(this._lines.length - newLines.length);
    }
    this._renderLines(newLines);
    if (follow) {
      this._followBottom();
    } else {
      this._newLogsIndicator = true;
    }
  }

  public clear() {
    this._cancelFollowBottom();
    this._lines = [];
    this._newLogsIndicator = false;
    this._noMatches = false;
    if (this._ready) {
      this._ansiToHtml.clear();
    }
  }

  public scrollToBottom() {
    this._newLogsIndicator = false;
    if (this._ready) {
      this._logElement.scrollTo(0, this._logElement.scrollHeight);
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._cancelFollowBottom();
    this._debouncedFilter.cancel();
  }

  protected render() {
    return html`
      <div class="log" tabindex="0" @scroll=${this._handleScroll}>
        <slot></slot>
        ${
          this._noMatches
            ? html`<div class="no-matches">
                ${this._i18n.localize("ui.components.log_viewer.no_matches")}
              </div>`
            : nothing
        }
        <ha-ansi-to-html ?wrap-disabled=${this.wrapDisabled}></ha-ansi-to-html>
      </div>
      <ha-button
        class="new-logs-indicator ${classMap({
          visible: this._newLogsIndicator,
        })}"
        size="s"
        appearance="filled"
        .disabled=${!this._newLogsIndicator}
        @click=${this.scrollToBottom}
      >
        <ha-svg-icon .path=${mdiArrowCollapseDown} slot="start"></ha-svg-icon>
        ${this._i18n.localize("ui.components.log_viewer.scroll_down_button")}
        <ha-svg-icon .path=${mdiArrowCollapseDown} slot="end"></ha-svg-icon>
      </ha-button>
    `;
  }

  protected async firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    await this._ansiToHtml.updateComplete;
    this._renderLines(this._lines);
    this._ready = true;
    this.scrollToBottom();
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (
      changedProps.has("filter") &&
      changedProps.get("filter") !== undefined
    ) {
      this._debouncedFilter();
    }
  }

  private _renderLines(lines: string[]) {
    this._ansiToHtml.parseLinesToColoredPre(lines);
    if (this.filter) {
      this._applyFilter();
    }
  }

  private _debouncedFilter = debounce(() => {
    this._applyFilter();
    if (!this.filter) {
      this.scrollToBottom();
    }
  }, 150);

  private _applyFilter() {
    this._noMatches =
      this._lines.length > 0 && !this._ansiToHtml.filterLines(this.filter);
  }

  private _trimLines(keptLines: number) {
    const logElement = this._logElement;
    const scrollTopBeforeTrim = logElement.scrollTop;
    const scrollHeightBeforeTrim = logElement.scrollHeight;
    this._ansiToHtml.trimLines(keptLines);
    const removedHeight = scrollHeightBeforeTrim - logElement.scrollHeight;
    logElement.scrollTop = Math.max(0, scrollTopBeforeTrim - removedHeight);
  }

  private _isScrolledToBottom(): boolean {
    const log = this._logElement;
    return (
      log.scrollHeight - log.scrollTop - log.clientHeight < SCROLL_FOLLOW_MARGIN
    );
  }

  private _handleScroll() {
    if (this._newLogsIndicator && this._isScrolledToBottom()) {
      this._newLogsIndicator = false;
    }
  }

  private _followBottom() {
    this._cancelFollowBottom();
    const logElement = this._logElement;
    const scrollTopBeforeFrame = logElement.scrollTop;
    this._followFrame = requestAnimationFrame(() => {
      this._followFrame = undefined;
      if (logElement.scrollTop === scrollTopBeforeFrame) {
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

  static styles = css`
    :host {
      position: relative;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-md);
      overflow: hidden;
    }
    .log {
      flex: 1;
      min-height: 0;
      padding: var(--ha-space-2) var(--ha-space-2) var(--ha-space-8);
      box-sizing: border-box;
      overflow: auto;
      overflow-anchor: none;
      direction: ltr;
      font-family: var(--ha-font-family-code);
      font-size: var(--ha-font-size-s);
    }
    .log:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: -2px;
    }
    .no-matches {
      color: var(--secondary-text-color);
      padding: var(--ha-space-2);
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
    @media (prefers-reduced-motion: reduce) {
      .new-logs-indicator {
        transition: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-log-viewer": HaLogViewer;
  }
}
