import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-ansi-to-html";
import type { HaAnsiToHtml } from "../../../components/ha-ansi-to-html";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import { subscribeIntegrationLog } from "../../../data/error_log";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { fileDownload } from "../../../util/file_download";
import type { LiveLogDialogParams } from "./show-dialog-live-log";

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\x1b\[[0-9;]*m/g;

// Stay close to the bottom to keep following new lines
const SCROLL_FOLLOW_MARGIN = 40;

@customElement("dialog-live-log")
class DialogLiveLog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LiveLogDialogParams;

  @state() private _open = false;

  @state() private _lineCount = 0;

  @state() private _unsupported = false;

  @query(".log") private _logElement?: HTMLElement;

  @query("ha-ansi-to-html") private _ansiToHtml?: HaAnsiToHtml;

  private _lines: string[] = [];

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
    this._lineCount = 0;
    this._unsupported = false;
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
    this._unsub.catch(() => {
      this._unsub = undefined;
      this._unsupported = true;
    });
  }

  private _unsubscribe() {
    this._unsub?.then((unsub) => unsub());
    this._unsub = undefined;
  }

  private _addLines(lines: string[]) {
    const newLines = lines.flatMap((line) => line.split("\n"));
    if (!newLines.length) {
      return;
    }
    const log = this._logElement;
    const follow =
      !log ||
      log.scrollHeight - log.scrollTop - log.clientHeight <
        SCROLL_FOLLOW_MARGIN;
    this._lines.push(...newLines);
    this._lineCount = this._lines.length;
    this._ansiToHtml?.parseLinesToColoredPre(newLines);
    if (follow) {
      requestAnimationFrame(() => {
        if (this._logElement) {
          this._logElement.scrollTop = this._logElement.scrollHeight;
        }
      });
    }
  }

  private _download() {
    const text = this._lines.join("\n").replace(ANSI_ESCAPE, "");
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
        @closed=${this._dialogClosed}
      >
        ${
          this._unsupported
            ? html`<ha-alert alert-type="error">
                ${this.hass.localize(
                  "ui.panel.config.integrations.config_entry.live_log.unsupported"
                )}
              </ha-alert>`
            : html`<div class="log">
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
                <ha-ansi-to-html></ha-ansi-to-html>
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
        .log {
          height: 60vh;
          overflow: auto;
          direction: ltr;
          font-family: var(--ha-font-family-code);
          font-size: var(--ha-font-size-s);
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
