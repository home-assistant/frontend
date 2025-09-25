import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiArrowCollapseDown, mdiDownload } from "@mdi/js";
// eslint-disable-next-line import/extensions
import { IntersectionController } from "@lit-labs/observers/intersection-controller.js";
import { LitElement, type PropertyValues, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../src/common/dom/fire_event";
import type {
  LandingPageKeys,
  LocalizeFunc,
} from "../../../src/common/translations/localize";
import { waitForSeconds } from "../../../src/common/util/wait";
import "../../../src/components/ha-alert";
import "../../../src/components/ha-ansi-to-html";
import type { HaAnsiToHtml } from "../../../src/components/ha-ansi-to-html";
import "../../../src/components/ha-button";
import "../../../src/components/ha-icon-button";
import "../../../src/components/ha-svg-icon";
import { fileDownload } from "../../../src/util/file_download";
import {
  getObserverLogs,
  downloadUrl as observerLogsDownloadUrl,
} from "../data/observer";
import { getSupervisorLogs, getSupervisorLogsFollow } from "../data/supervisor";
import { ASSUME_CORE_START_SECONDS } from "../ha-landing-page";

const ERROR_CHECK = /^[\d\s-:]+(ERROR|CRITICAL)(.*)/gm;
declare global {
  interface HASSDomEvents {
    "landing-page-error": undefined;
  }
}

const SCHEDULE_FETCH_OBSERVER_LOGS = 5;

@customElement("landing-page-logs")
class LandingPageLogs extends LitElement {
  @property({ attribute: false })
  public localize!: LocalizeFunc<LandingPageKeys>;

  @query("ha-ansi-to-html") private _ansiToHtmlElement?: HaAnsiToHtml;

  @query(".logs") private _logElement?: HTMLElement;

  @query("#scroll-bottom-marker")
  private _scrollBottomMarkerElement?: HTMLElement;

  @state() private _show = false;

  @state() private _scrolledToBottomController =
    new IntersectionController<boolean>(this, {
      callback(this: IntersectionController<boolean>, entries) {
        return entries[0].isIntersecting;
      },
    });

  @state() private _error = false;

  @state() private _newLogsIndicator?: boolean;

  @state() private _logLinesCount = 0;

  protected render() {
    return html`
      <div class="actions">
        <ha-button appearance="plain" @click=${this._toggleLogDetails}>
          ${this.localize(this._show ? "hide_details" : "show_details")}
        </ha-button>
        ${this._show
          ? html`<ha-icon-button
              .label=${this.localize("logs.download_logs")}
              .path=${mdiDownload}
              @click=${this._downloadLogs}
            ></ha-icon-button>`
          : nothing}
      </div>
      ${this._error
        ? html`
            <ha-alert
              alert-type="error"
              .title=${this.localize("logs.fetch_error")}
            >
              <ha-button
                size="small"
                variant="danger"
                @click=${this._startLogStream}
              >
                ${this.localize("logs.retry")}
              </ha-button>
            </ha-alert>
          `
        : nothing}
      <div
        class=${classMap({
          logs: true,
          hidden: !this._show,
        })}
      >
        <ha-ansi-to-html></ha-ansi-to-html>
        <div id="scroll-bottom-marker"></div>
      </div>
      <ha-button
        class="new-logs-indicator ${classMap({
          visible:
            (this._show &&
              this._newLogsIndicator &&
              !this._scrolledToBottomController.value) ||
            false,
        })}"
        size="small"
        appearance="filled"
        @click=${this._scrollToBottom}
      >
        <ha-svg-icon .path=${mdiArrowCollapseDown} slot="start"></ha-svg-icon>
        ${this.localize("logs.scroll_down_button")}
        <ha-svg-icon .path=${mdiArrowCollapseDown} slot="end"></ha-svg-icon>
      </ha-button>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);

    this._scrolledToBottomController.observe(this._scrollBottomMarkerElement!);

    this._startLogStream();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (this._newLogsIndicator && this._scrolledToBottomController.value) {
      this._newLogsIndicator = false;
    }

    if (changedProps.has("_show") && this._show) {
      this._scrollToBottom();
    }
  }

  private _toggleLogDetails() {
    this._show = !this._show;
  }

  private _scrollToBottom(): void {
    if (this._logElement) {
      this._newLogsIndicator = false;
      this._logElement!.scrollTo(0, this._logElement!.scrollHeight);
    }
  }

  private _displayLogs(logs: string, tempLogLine = "", clear = false): string {
    if (clear) {
      this._ansiToHtmlElement?.clear();
      this._logLinesCount = 0;
    }

    const showError = ERROR_CHECK.test(logs);

    const scrolledToBottom = this._scrolledToBottomController.value;
    const lines = `${tempLogLine}${logs}`
      .split("\n")
      .filter((line) => line.trim() !== "");

    // handle edge case where the last line is not complete
    if (logs.endsWith("\n")) {
      tempLogLine = "";
    } else {
      tempLogLine = lines.splice(-1, 1)[0];
    }

    if (lines.length) {
      this._ansiToHtmlElement?.parseLinesToColoredPre(lines);
      this._logLinesCount += lines.length;
    }

    if (showError) {
      fireEvent(this, "landing-page-error");
      this._show = true;
    }

    if (showError || (scrolledToBottom && this._logElement)) {
      this._scrollToBottom();
    } else {
      this._newLogsIndicator = true;
    }

    return tempLogLine;
  }

  private async _startLogStream() {
    this._error = false;
    this._newLogsIndicator = false;
    this._ansiToHtmlElement?.clear();

    try {
      const response = await getSupervisorLogsFollow();

      if (!response.ok || !response.body) {
        throw new Error("No stream body found");
      }

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
          tempLogLine = this._displayLogs(chunk, tempLogLine);
        }
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);

      // fallback to observer logs if there is a problem with supervisor
      this._loadObserverLogs();
    }
  }

  private _scheduleObserverLogs() {
    setTimeout(async () => {
      try {
        // check if supervisor logs are available
        const superVisorLogsResponse = await getSupervisorLogs(1);
        if (superVisorLogsResponse.ok) {
          this._startLogStream();
          return;
        }
      } catch (_err) {
        // ignore and continue with observer logs
      }
      this._loadObserverLogs();
    }, SCHEDULE_FETCH_OBSERVER_LOGS * 1000);
  }

  private async _loadObserverLogs() {
    try {
      const response = await getObserverLogs();

      if (!response.ok) {
        throw new Error("Error fetching observer logs");
      }

      const logs = await response.text();

      this._displayLogs(logs, "", true);

      this._scheduleObserverLogs();
    } catch (err) {
      // wait because there is a moment where landingpage is down and core is not up yet
      await waitForSeconds(ASSUME_CORE_START_SECONDS);

      // eslint-disable-next-line no-console
      console.error(err);
      this._error = true;
    }
  }

  private _downloadLogs() {
    const timeString = new Date().toISOString().replace(/:/g, "-");

    fileDownload(observerLogsDownloadUrl, `observer_${timeString}.log`);
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
      }

      ha-alert {
        width: 100%;
      }

      .actions {
        position: relative;
        width: 100%;
        text-align: center;
      }

      .actions ha-icon-button {
        position: absolute;
        right: 0;
        top: -4px;
        --icon-primary-color: var(--primary-color);
      }

      .logs {
        width: 100%;
        max-height: 300px;
        overflow: auto;
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-border-radius-sm);
        padding: 4px;
      }

      .logs.hidden {
        display: none;
      }

      .new-logs-indicator {
        overflow: hidden;
        position: absolute;
        bottom: 4px;
        left: 4px;
        height: 0;

        transition: height 0.4s ease-out;
        display: flex;
      }

      .new-logs-indicator.visible {
        height: 24px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "landing-page-logs": LandingPageLogs;
  }
}
