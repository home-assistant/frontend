import {
  html,
  LitElement,
  css,
  CSSResult,
  customElement,
  property,
} from "lit-element";

import "@material/mwc-button";
import "../../../../components/dialog/ha-paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HaPaperDialog } from "../../../../components/dialog/ha-paper-dialog";

import { HomeAssistant } from "../../../../types";
import { haStyle } from "../../../../resources/styles";
import { CloudCertificateParams as CloudCertificateDialogParams } from "./show-dialog-cloud-certificate";
import { formatDateTime } from "../../../../common/datetime/format_date_time";

@customElement("dialog-cloud-certificate")
class DialogCloudCertificate extends LitElement {
  public hass!: HomeAssistant;

  @property()
  private _params?: CloudCertificateDialogParams;

  public async showDialog(params: CloudCertificateDialogParams) {
    this._params = params;
    // Wait till dialog is rendered.
    await this.updateComplete;
    this._dialog.open();
  }

  protected render() {
    if (!this._params) {
      return html``;
    }
    const { certificateInfo } = this._params;

    return html`
      <ha-paper-dialog with-backdrop>
        <h2>
          ${this.hass!.localize(
            "ui.panel.config.cloud.dialog_certificate.certificate_information"
          )}
        </h2>
        <div>
          <p>
            ${this.hass!.localize(
              "ui.panel.config.cloud.dialog_certificate.certificate_expiration_date"
            )}
            ${formatDateTime(
              new Date(certificateInfo.expire_date),
              this.hass!.language
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

        <div class="paper-dialog-buttons">
          <mwc-button @click="${this._closeDialog}"
            >${this.hass!.localize(
              "ui.panel.config.cloud.dialog_certificate.close"
            )}</mwc-button
          >
        </div>
      </ha-paper-dialog>
    `;
  }

  private get _dialog(): HaPaperDialog {
    return this.shadowRoot!.querySelector("ha-paper-dialog")!;
  }

  private _closeDialog() {
    this._dialog.close();
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        ha-paper-dialog {
          width: 535px;
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
