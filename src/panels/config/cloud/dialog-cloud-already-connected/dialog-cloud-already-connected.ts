import { mdiEye, mdiEyeOff } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-wa-dialog";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { obfuscateUrl } from "../../../../util/url";
import type { CloudAlreadyConnectedParams as CloudAlreadyConnectedDialogParams } from "./show-dialog-cloud-already-connected";

@customElement("dialog-cloud-already-connected")
class DialogCloudAlreadyConnected extends LitElement {
  public hass!: HomeAssistant;

  @state() private _params?: CloudAlreadyConnectedDialogParams;

  @state() private _open = false;

  @state() private _obfuscateIp = true;

  public showDialog(params: CloudAlreadyConnectedDialogParams) {
    this._params = params;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._open = false;
    this._params?.closeDialog?.();
    this._params = undefined;
    this._obfuscateIp = true;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const { details } = this._params;

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.cloud.dialog_already_connected.heading"
        )}
        @closed=${this._dialogClosed}
        width="medium"
      >
        <div class="intro">
          <span>
            ${this.hass.localize(
              "ui.panel.config.cloud.dialog_already_connected.description"
            )}
          </span>
          <b>
            ${this.hass.localize(
              "ui.panel.config.cloud.dialog_already_connected.other_home_assistant"
            )}
          </b>
        </div>
        <div class="instance-details">
          ${details.name
            ? html`<div class="instance-detail">
                <span>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.dialog_already_connected.instance_name"
                  )}:
                </span>
                <span>${details.name}</span>
              </div>`
            : nothing}
          ${details.version
            ? html`<div class="instance-detail">
                <span>
                  ${this.hass.localize(
                    "ui.panel.config.cloud.dialog_already_connected.instance_version"
                  )}:
                </span>
                <span>${details.version}</span>
              </div>`
            : nothing}
          <div class="instance-detail">
            <span>
              ${this.hass.localize(
                "ui.panel.config.cloud.dialog_already_connected.ip_address"
              )}:
            </span>
            <div class="obfuscated">
              <span>
                ${this._obfuscateIp
                  ? obfuscateUrl(details.remote_ip_address)
                  : details.remote_ip_address}
              </span>

              <ha-icon-button
                class="toggle-unmasked-url"
                .label=${this.hass.localize(
                  `ui.panel.config.cloud.dialog_already_connected.obfuscated_ip.${this._obfuscateIp ? "hide" : "show"}`
                )}
                @click=${this._toggleObfuscateIp}
                .path=${this._obfuscateIp ? mdiEye : mdiEyeOff}
              ></ha-icon-button>
            </div>
          </div>
          <div class="instance-detail">
            <span>
              ${this.hass.localize(
                "ui.panel.config.cloud.dialog_already_connected.connected_at"
              )}:
            </span>
            <span>
              ${formatDateTime(
                new Date(details.connected_at),
                this.hass.locale,
                this.hass.config
              )}
            </span>
          </div>
        </div>
        <ha-alert
          alert-type="info"
          .title=${this.hass.localize(
            "ui.panel.config.cloud.dialog_already_connected.info_backups.title"
          )}
        >
          ${this.hass.localize(
            "ui.panel.config.cloud.dialog_already_connected.info_backups.description"
          )}
        </ha-alert>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass!.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._logInHere}>
            ${this.hass!.localize(
              "ui.panel.config.cloud.dialog_already_connected.login_here"
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _toggleObfuscateIp() {
    this._obfuscateIp = !this._obfuscateIp;
  }

  private _logInHere() {
    this._params?.logInHereAction?.();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .intro b {
          display: block;
          margin-top: 16px;
        }
        .instance-details {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
        }
        .instance-detail {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
        }
        .obfuscated {
          align-items: center;
          display: flex;
          flex-direction: row;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-cloud-already-connected": DialogCloudAlreadyConnected;
  }
}
