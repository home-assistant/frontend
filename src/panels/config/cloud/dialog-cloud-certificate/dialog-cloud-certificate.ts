import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import { fireEvent } from "../../../../common/dom/fire_event";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { CloudCertificateParams as CloudCertificateDialogParams } from "./show-dialog-cloud-certificate";

@customElement("dialog-cloud-certificate")
class DialogCloudCertificate extends LitElement {
  public hass!: HomeAssistant;

  @property()
  private _params?: CloudCertificateDialogParams;

  public showDialog(params: CloudCertificateDialogParams) {
    this._params = params;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return html``;
    }
    const { certificateInfo } = this._params;

    return html`
      <ha-dialog
        open
        .heading=${this.hass!.localize(
          "ui.panel.config.cloud.dialog_certificate.certificate_information"
        )}
      >
        <div>
          <p>
            ${this.hass!.localize(
              "ui.panel.config.cloud.dialog_certificate.certificate_expiration_date"
            )}
            ${formatDateTime(
              new Date(certificateInfo.expire_date),
              this.hass!.locale
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
        </div>

        <mwc-button @click=${this.closeDialog} slot="primaryAction">
          ${this.hass!.localize(
            "ui.panel.config.cloud.dialog_certificate.close"
          )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 535px;
        }
        .break-word {
          overflow-wrap: break-word;
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
