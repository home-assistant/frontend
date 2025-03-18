import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { mdiEye, mdiEyeOff } from "@mdi/js";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import { createCloseHeading } from "../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { CloudAlreadyConnectedParams as CloudAlreadyConnectedDialogParams } from "./show-dialog-cloud-already-connected";
import { obfuscateUrl } from "../../../../util/url";

@customElement("dialog-cloud-already-connected")
class DialogCloudAlreadyConnected extends LitElement {
  public hass!: HomeAssistant;

  @state() private _params?: CloudAlreadyConnectedDialogParams;

  @state() private _obfuscateIp = true;

  public showDialog(params: CloudAlreadyConnectedDialogParams) {
    this._params = params;
  }

  public closeDialog() {
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
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            "ui.panel.config.cloud.dialog_already_connected.heading"
          )
        )}
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

        <ha-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass!.localize("ui.common.cancel")}
        </ha-button>
        <ha-button @click=${this._logInHere} slot="primaryAction">
          ${this.hass!.localize(
            "ui.panel.config.cloud.dialog_already_connected.login_here"
          )}
        </ha-button>
      </ha-dialog>
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
        ha-dialog {
          --mdc-dialog-max-width: 535px;
        }
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
