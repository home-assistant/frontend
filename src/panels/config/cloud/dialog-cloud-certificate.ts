import {
  html,
  LitElement,
  css,
  CSSResult,
  customElement,
  property,
} from "lit-element";

import "@material/mwc-button";
import "@polymer/paper-dialog/paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";

import { HomeAssistant } from "../../../types";
import { haStyle } from "../../../resources/styles";
import { CloudCertificateParams as CloudCertificateDialogParams } from "./show-dialog-cloud-certificate";
import format_date_time from "../../../common/datetime/format_date_time";

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
      <paper-dialog with-backdrop>
        <h2>Certificate Information</h2>
        <div>
          <p>
            Certificate expiration date:
            ${format_date_time(
              new Date(certificateInfo.expire_date),
              this.hass!.language
            )}<br />
            (Will be automatically renewed)
          </p>
          <p>
            Certificate fingerprint: ${certificateInfo.fingerprint}
          </p>
        </div>

        <div class="paper-dialog-buttons">
          <mwc-button @click="${this._closeDialog}">CLOSE</mwc-button>
        </div>
      </paper-dialog>
    `;
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  private _closeDialog() {
    this._dialog.close();
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        paper-dialog {
          width: 535px;
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
