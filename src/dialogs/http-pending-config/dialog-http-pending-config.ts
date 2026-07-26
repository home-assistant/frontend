import { mdiArrowRight } from "@mdi/js";
import { ERR_CONNECTION_LOST } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { formatNumericDuration } from "../../common/datetime/format_duration";
import { fireEvent } from "../../common/dom/fire_event";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/ha-alert";
import "../../components/ha-button";
import "../../components/ha-dialog-footer";
import "../../components/ha-dialog";
import "../../components/ha-svg-icon";
import type { HttpConfig } from "../../data/http";
import {
  HTTP_CONFIG_FIELDS,
  promoteHttpConfig,
  saveHttpConfig,
} from "../../data/http";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { HassDialog } from "../make-dialog-manager";
import type { HttpPendingConfigDialogParams } from "./show-dialog-http-pending-config";

@customElement("dialog-http-pending-config")
export class DialogHttpPendingConfig
  extends LitElement
  implements HassDialog<HttpPendingConfigDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: HttpPendingConfigDialogParams;

  @state() private _open = false;

  @state() private _busy: "confirm" | "revert" | undefined;

  @state() private _error?: string;

  @state() private _secondsRemaining?: number;

  @state() private _reverted = false;

  private _interval?: number;

  public showDialog(params: HttpPendingConfigDialogParams): void {
    this._params = params;
    this._open = true;
    this._busy = undefined;
    this._error = undefined;
    this._reverted = false;
    this._startCountdown();
    // The field labels live in the config panel fragment, which is not loaded
    // yet when this dialog pops up on startup. Load it so the changed-field
    // names resolve; the dialog re-renders once hass updates.
    this.hass.loadFragmentTranslation("config");
  }

  public closeDialog(): boolean {
    this._open = false;
    this._stopCountdown();
    return true;
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopCountdown();
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._busy = undefined;
    this._error = undefined;
    this._reverted = false;
    this._secondsRemaining = undefined;
    this._stopCountdown();
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _startCountdown(): void {
    this._stopCountdown();
    const revertAt = this._params?.state.revert_at;
    if (!revertAt) {
      this._secondsRemaining = undefined;
      return;
    }
    const target = new Date(revertAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      this._secondsRemaining = remaining;
      if (remaining === 0) {
        this._stopCountdown();
        this._reverted = true;
      }
    };
    tick();
    if (this._secondsRemaining && this._secondsRemaining > 0) {
      this._interval = window.setInterval(tick, 1000);
    }
  }

  private _stopCountdown(): void {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private get _changedFields(): (keyof HttpConfig)[] {
    if (!this._params?.state.pending) {
      return [];
    }
    const { stable, pending } = this._params.state;
    return HTTP_CONFIG_FIELDS.filter(
      (key) => JSON.stringify(stable[key]) !== JSON.stringify(pending[key])
    );
  }

  private _formatValue(key: keyof HttpConfig, value: unknown): string {
    if (value === undefined || value === null || value === "") {
      return this.hass.localize("ui.dialogs.http_pending_config.not_set");
    }
    if (typeof value === "boolean") {
      return this.hass.localize(value ? "ui.common.yes" : "ui.common.no");
    }
    if (Array.isArray(value)) {
      return value.length
        ? value.join(", ")
        : this.hass.localize("ui.dialogs.http_pending_config.not_set");
    }
    if (key === "ssl_profile") {
      return (
        this.hass.localize(
          `ui.panel.config.network.http.ssl_profile_${value}` as any
        ) || String(value)
      );
    }
    return String(value);
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const changes = this._changedFields;
    const { stable, pending } = this._params.state;
    const rtl = computeRTL(
      this.hass.language,
      this.hass.translationMetadata.translations
    );

    return html`
      <ha-dialog
        .open=${this._open}
        .headerTitle=${this.hass.localize(
          "ui.dialogs.http_pending_config.title"
        )}
        prevent-scrim-close
        width="medium"
        @closed=${this._dialogClosed}
      >
        <span slot="headerNavigationIcon"></span>
        <div class="content">
          ${
            this._reverted
              ? html`
                  <ha-alert alert-type="info">
                    ${this.hass.localize(
                      "ui.dialogs.http_pending_config.reverted"
                    )}
                  </ha-alert>
                `
              : html`
                  <p>
                    ${this.hass.localize(
                      "ui.dialogs.http_pending_config.description"
                    )}
                  </p>
                  ${
                    this._secondsRemaining !== undefined
                      ? html`
                          <p class="countdown">
                            ${this.hass.localize(
                              "ui.dialogs.http_pending_config.auto_revert",
                              {
                                time:
                                  formatNumericDuration(this.hass.locale, {
                                    minutes: Math.floor(
                                      this._secondsRemaining / 60
                                    ),
                                    seconds: this._secondsRemaining % 60,
                                  }) ?? "0",
                              }
                            )}
                          </p>
                        `
                      : nothing
                  }
                `
          }
          ${
            changes.length
              ? html`
                  <p class="changes-label">
                    ${this.hass.localize(
                      "ui.dialogs.http_pending_config.changes_label"
                    )}
                  </p>
                  <ul>
                    ${changes.map(
                      (key) => html`
                        <li>
                          <span class="field">
                            ${this.hass.localize(
                              `ui.panel.config.network.http.fields.${key}` as any
                            )}
                          </span>
                          <span class="values">
                            <span class="old"
                              >${this._formatValue(key, stable[key])}</span
                            >
                            <ha-svg-icon
                              .path=${mdiArrowRight}
                              style=${styleMap({
                                transform: rtl ? "scaleX(-1)" : "",
                              })}
                            ></ha-svg-icon>
                            <span class="new"
                              >${this._formatValue(key, pending![key])}</span
                            >
                          </span>
                        </li>
                      `
                    )}
                  </ul>
                `
              : nothing
          }
          ${
            this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : nothing
          }
        </div>
        <ha-dialog-footer slot="footer">
          ${
            this._reverted
              ? html`
                  <ha-button slot="primaryAction" @click=${this._close}>
                    ${this.hass.localize("ui.dialogs.http_pending_config.close")}
                  </ha-button>
                `
              : html`
                  <ha-button
                    slot="secondaryAction"
                    appearance="plain"
                    .loading=${this._busy === "revert"}
                    .disabled=${this._busy === "confirm"}
                    @click=${this._revert}
                  >
                    ${this.hass.localize("ui.dialogs.http_pending_config.revert")}
                  </ha-button>
                  <ha-button
                    slot="primaryAction"
                    .loading=${this._busy === "confirm"}
                    .disabled=${this._busy === "revert"}
                    @click=${this._confirm}
                  >
                    ${this.hass.localize(
                      "ui.dialogs.http_pending_config.confirm"
                    )}
                  </ha-button>
                `
          }
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _confirm(): Promise<void> {
    if (this._busy) {
      return;
    }
    this._busy = "confirm";
    this._error = undefined;
    try {
      await promoteHttpConfig(this.hass);
      this._notifyResolved();
      this._open = false;
    } catch (err: any) {
      // A confirm fired right as the backend auto-reverts may race the
      // restart and surface as a connection-lost error. Treat it as resolved;
      // the disconnected overlay takes over.
      if (err?.error?.code === ERR_CONNECTION_LOST) {
        this._notifyResolved();
        this._open = false;
        return;
      }
      this._error = this.hass.localize(
        "ui.dialogs.http_pending_config.confirm_error",
        { error: err.message ?? "" }
      );
      this._busy = undefined;
    }
  }

  private _close(): void {
    this._notifyResolved();
    this._open = false;
  }

  private async _revert(): Promise<void> {
    if (this._busy || !this._params) {
      return;
    }
    this._busy = "revert";
    this._error = undefined;
    try {
      await saveHttpConfig(this.hass, null);
      this._notifyResolved();
      this._open = false;
    } catch (err: any) {
      // The restart triggered by clearing pending may cut the WS connection
      // before we get a reply. The disconnected overlay takes over from here.
      if (err?.error?.code === ERR_CONNECTION_LOST) {
        this._notifyResolved();
        this._open = false;
        return;
      }
      this._error = this.hass.localize(
        "ui.dialogs.http_pending_config.revert_error",
        { error: err.message ?? "" }
      );
      this._busy = undefined;
    }
  }

  private _notifyResolved(): void {
    this._params?.onResolved?.();
    // The form on Settings > System > Network may be mounted and showing
    // stale state; let it know to refetch.
    window.dispatchEvent(new Event("http-config-resolved"));
  }

  static styles = [
    haStyleDialog,
    css`
      .content {
        line-height: var(--ha-line-height-normal);
      }
      p {
        margin: 0 0 var(--ha-space-4) 0;
      }
      .countdown {
        color: var(--secondary-text-color);
      }
      .changes-label {
        font-weight: var(--ha-font-weight-medium);
        margin-bottom: var(--ha-space-2);
      }
      ul {
        list-style: none;
        margin: 0 0 var(--ha-space-4) 0;
        padding: 0;
      }
      li {
        padding: var(--ha-space-2) 0;
        border-bottom: 1px solid var(--divider-color);
      }
      li:last-child {
        border-bottom: none;
      }
      .field {
        display: block;
        font-weight: var(--ha-font-weight-medium);
        margin-bottom: var(--ha-space-1);
      }
      .values {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--ha-space-2);
        color: var(--secondary-text-color);
        word-break: break-word;
      }
      .values .new {
        color: var(--primary-text-color);
      }
      .values ha-svg-icon {
        --mdc-icon-size: 18px;
        flex-shrink: 0;
      }
      ha-alert {
        display: block;
        margin-top: var(--ha-space-4);
        margin-bottom: var(--ha-space-4);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-http-pending-config": DialogHttpPendingConfig;
  }
}
