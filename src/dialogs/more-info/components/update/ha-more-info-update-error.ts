import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/animation/ha-fade-in";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/skeleton/ha-skeleton-text";
import { apiContext } from "../../../../data/context";
import { LogSeverity } from "../../../../data/integration";
import type { SupervisorLogEntry } from "../../../../data/supervisor/logs";
import { fetchSupervisorLogs } from "../../../../data/supervisor/logs";
import type { HomeAssistantApi } from "../../../../types";

const MAX_LOG_ENTRIES = 5;

@customElement("ha-more-info-update-error")
export class HaMoreInfoUpdateError extends LitElement {
  @property() public error = "";

  // When the failed update started, to show what the Supervisor logged since
  @property({ attribute: false }) public logsSince?: number;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _logEntries?: SupervisorLogEntry[];

  @state() private _logsFailed = false;

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);

    if (changedProps.has("logsSince")) {
      this._logEntries = undefined;
      this._logsFailed = false;

      if (this.logsSince !== undefined) {
        this._fetchLogEntries(this.logsSince);
      }
    }
  }

  protected render() {
    return html`
      <div class="container">
        <ha-alert
          alert-type="error"
          .title=${this._localize(
            "ui.dialogs.more_info_control.update.install_error.title"
          )}
        >
          ${this.error}
        </ha-alert>
        ${
          this.logsSince !== undefined
            ? html`<div class="logs">
                <div class="logs-header">
                  <span class="logs-title">
                    ${this._localize(
                      "ui.dialogs.more_info_control.update.install_error.supervisor_logs"
                    )}
                  </span>
                  <ha-button
                    appearance="plain"
                    size="s"
                    @click=${this._showFullLogs}
                  >
                    ${this._localize(
                      "ui.dialogs.more_info_control.update.install_error.show_full_logs"
                    )}
                  </ha-button>
                </div>
                ${this._renderLogEntries()}
              </div>`
            : nothing
        }
      </div>
    `;
  }

  private _renderLogEntries() {
    if (this._logsFailed) {
      return html`<p class="status">
        ${this._localize(
          "ui.dialogs.more_info_control.update.install_error.logs_failed"
        )}
      </p>`;
    }

    if (!this._logEntries) {
      return html`<ha-fade-in .delay=${500}>
        <ha-skeleton-text></ha-skeleton-text>
      </ha-fade-in>`;
    }

    if (!this._logEntries.length) {
      return html`<p class="status">
        ${this._localize(
          "ui.dialogs.more_info_control.update.install_error.no_log_warnings"
        )}
      </p>`;
    }

    return html`<ol class="entries">
      ${this._logEntries.map(
        (entry) =>
          html`<li>
            <span class="time">${entry.time}</span>
            <span class="level ${entry.level.toLowerCase()}"
              >${entry.level}</span
            >
            ${entry.message}
          </li>`
      )}
    </ol>`;
  }

  private async _fetchLogEntries(since: number): Promise<void> {
    try {
      const entries = await fetchSupervisorLogs(this._api, {
        duration: Date.now() - since,
        minLevel: LogSeverity.WARNING,
      });

      if (this.logsSince === since) {
        this._logEntries = entries.slice(-MAX_LOG_ENTRIES);
      }
    } catch (_err: unknown) {
      if (this.logsSince === since) {
        this._logsFailed = true;
      }
    }
  }

  private _showFullLogs(): void {
    navigate("/config/logs?provider=supervisor");
    fireEvent(this, "close-dialog");
  }

  static styles = css`
    :host {
      display: block;
    }
    .container {
      border-radius: var(--ha-border-radius-sm);
      overflow: hidden;
    }
    ha-alert {
      display: block;
      --ha-border-radius-sm: 0;
    }
    .logs {
      border-top: 1px solid var(--divider-color);
      background-color: rgba(var(--rgb-error-color), 0.05);
      padding: var(--ha-space-1) var(--ha-space-2) var(--ha-space-3);
      padding-inline-start: var(--ha-space-10);
    }
    .logs-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ha-space-2);
    }
    .logs-title {
      color: var(--secondary-text-color);
      font-weight: var(--ha-font-weight-medium);
    }
    .entries {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-1);
      margin: 0;
      padding: 0;
      list-style: none;
      direction: ltr;
      text-align: left;
      font-family: var(--ha-font-family-code);
      font-size: var(--ha-font-size-s);
      line-height: var(--ha-line-height-condensed);
      overflow-wrap: anywhere;
      /* Keeps the update actions in the sticky footer on screen */
      max-height: 25vh;
      overflow-y: auto;
    }
    .entries li {
      padding-left: 2ch;
      text-indent: -2ch;
    }
    .time {
      color: var(--secondary-text-color);
    }
    .level {
      font-weight: var(--ha-font-weight-bold);
    }
    .level.warning {
      color: var(--ha-color-on-warning-normal);
    }
    .level.error,
    .level.critical {
      color: var(--ha-color-on-danger-normal);
    }
    .status {
      margin: 0;
      color: var(--secondary-text-color);
    }
    @media all and (max-width: 450px), all and (max-height: 500px) {
      .logs {
        padding-inline-start: var(--ha-space-2);
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-update-error": HaMoreInfoUpdateError;
  }
}
