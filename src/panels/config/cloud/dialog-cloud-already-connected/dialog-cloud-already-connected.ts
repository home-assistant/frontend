import "@material/mwc-button";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { CloudAlreadyConnectedParams as CloudAlreadyConnectedDialogParams } from "./show-dialog-cloud-already-connected";
import "../../../../components/ha-alert";

@customElement("dialog-cloud-already-connected")
class DialogCloudAlreadyConnected extends LitElement {
  public hass!: HomeAssistant;

  @state() private _params?: CloudAlreadyConnectedDialogParams;

  public showDialog(params: CloudAlreadyConnectedDialogParams) {
    this._params = params;
  }

  public closeDialog() {
    this._params?.closeDialog();
    this._params = undefined;
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
        <div>
          <p>
            ${this.hass.localize(
              "ui.panel.config.cloud.dialog_already_connected.description"
            )}
          </p>
          <b>
            ${this.hass.localize(
              "ui.panel.config.cloud.dialog_already_connected.other_home_assistant"
            )}
          </b>
          <div class="instance-details">
            <div class="instance-detail">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.dialog_already_connected.ip_address"
                )}:
              </p>
              <p>${details.remote_ip_address}</p>
            </div>
            <div class="instance-detail">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.cloud.dialog_already_connected.connected_at"
                )}:
              </p>
              <p>
                ${formatDateTime(
                  new Date(details.connected_at),
                  this.hass.locale,
                  this.hass.config
                )}
              </p>
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
        </div>

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass!.localize(
            "ui.panel.config.cloud.dialog_already_connected.close"
          )}
        </mwc-button>
        <mwc-button @click=${this.logInHere} slot="primaryAction">
          ${this.hass!.localize(
            "ui.panel.config.cloud.dialog_already_connected.login_here"
          )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  logInHere() {
    this._params?.logInHereAction();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 535px;
        }
        .instance-details {
          display: flex;
          flex-direction: column;
          margin-right: 20%;
        }
        .instance-detail {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
        p {
          margin-top: 0;
          margin-bottom: 12px;
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
