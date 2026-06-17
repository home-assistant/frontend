import { ERR_CONNECTION_LOST } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-alert";
import "../../components/ha-button";
import "../../components/ha-dialog-footer";
import "../../components/ha-dialog";
import type { HttpConfig } from "../../data/http";
import { promoteHttpConfig, saveHttpConfig } from "../../data/http";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { HassDialog } from "../make-dialog-manager";
import type { HttpPendingConfigDialogParams } from "./show-dialog-http-pending-config";

const HTTP_FIELDS: (keyof HttpConfig)[] = [
  "server_port",
  "server_host",
  "ssl_certificate",
  "ssl_key",
  "ssl_peer_certificate",
  "ssl_profile",
  "cors_allowed_origins",
  "use_x_forwarded_for",
  "trusted_proxies",
  "use_x_frame_options",
  "ip_ban_enabled",
  "login_attempts_threshold",
];

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

  public showDialog(params: HttpPendingConfigDialogParams): void {
    this._params = params;
    this._open = true;
    this._busy = undefined;
    this._error = undefined;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._busy = undefined;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private get _changedFields(): (keyof HttpConfig)[] {
    if (!this._params?.state.pending) {
      return [];
    }
    const { stable, pending } = this._params.state;
    return HTTP_FIELDS.filter(
      (key) => JSON.stringify(stable[key]) !== JSON.stringify(pending[key])
    );
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const changes = this._changedFields;

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
          <p>
            ${this.hass.localize("ui.dialogs.http_pending_config.description")}
          </p>
          ${changes.length
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
                        ${this.hass.localize(
                          `ui.panel.config.network.http.fields.${key}` as any
                        )}
                      </li>
                    `
                  )}
                </ul>
              `
            : nothing}
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}
        </div>
        <ha-dialog-footer slot="footer">
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
            ${this.hass.localize("ui.dialogs.http_pending_config.confirm")}
          </ha-button>
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
      this._error = this.hass.localize(
        "ui.dialogs.http_pending_config.confirm_error",
        { error: err.message ?? "" }
      );
      this._busy = undefined;
    }
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
      .changes-label {
        font-weight: var(--ha-font-weight-medium);
        margin-bottom: var(--ha-space-2);
      }
      ul {
        margin: 0 0 var(--ha-space-4) 0;
        padding-left: var(--ha-space-6);
        color: var(--secondary-text-color);
      }
      li {
        margin-bottom: var(--ha-space-1);
      }
      ha-alert {
        display: block;
        margin-top: var(--ha-space-4);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-http-pending-config": DialogHttpPendingConfig;
  }
}
