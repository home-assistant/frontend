import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-dialog-footer";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../../../../components/ha-button";
import "../../../../components/ha-wa-dialog";
import type { CloudCertificateParams as CloudCertificateDialogParams } from "./show-dialog-cloud-certificate";

@customElement("dialog-cloud-certificate")
class DialogCloudCertificate extends LitElement {
  public hass!: HomeAssistant;

  @state() private _params?: CloudCertificateDialogParams;

  @state() private _open = false;

  public showDialog(params: CloudCertificateDialogParams) {
    this._params = params;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._open = false;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const { certificateInfo } = this._params;

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.cloud.dialog_certificate.certificate_information"
        )}
        @closed=${this._dialogClosed}
        width="medium"
      >
        <div>
          <p>
            ${this.hass!.localize(
              "ui.panel.config.cloud.dialog_certificate.certificate_expiration_date"
            )}
            ${formatDateTime(
              new Date(certificateInfo.expire_date),
              this.hass!.locale,
              this.hass!.config
            )}<br />
            (${this.hass!.localize(
              "ui.panel.config.cloud.dialog_certificate.will_be_auto_renewed"
            )})
          </p>
          <p class="break-word">
            ${this.hass!.localize(
              "ui.panel.config.cloud.dialog_certificate.fingerprint"
            )}
            ${certificateInfo.fingerprint}
          </p>
          <p class="break-word">
            ${this.hass!.localize(
              "ui.panel.config.cloud.dialog_certificate.alternative_names"
            )}
          </p>
          <ul>
            ${certificateInfo.alternative_names.map(
              (name) => html`<li><code>${name}</code></li>`
            )}
          </ul>
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this.hass!.localize(
              "ui.panel.config.cloud.dialog_certificate.close"
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .break-word {
          overflow-wrap: break-word;
        }
        p {
          margin-top: 0;
          margin-bottom: 12px;
        }
        p:last-child {
          margin-bottom: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-cloud-certificate": DialogCloudCertificate;
  }
}
