import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { createCloseHeading } from "../../components/ha-dialog";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { LongLivedAccessTokenDialogParams } from "./show-long-lived-access-token-dialog";
import "../../components/ha-textfield";

const QR_LOGO_URL = "/static/icons/favicon-192x192.png";

@customElement("ha-long-lived-access-token-dialog")
export class HaLongLivedAccessTokenDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LongLivedAccessTokenDialogParams;

  @state() private _qrCode?: TemplateResult;

  public showDialog(params: LongLivedAccessTokenDialogParams): void {
    this._params = params;
  }

  public closeDialog() {
    this._params = undefined;
    this._qrCode = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params || !this._params.token) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        hideActions
        .heading=${createCloseHeading(this.hass, this._params.name)}
        @closed=${this.closeDialog}
      >
        <div>
          <ha-textfield
            dialogInitialFocus
            .value=${this._params.token}
            .label=${this.hass.localize(
              "ui.panel.profile.long_lived_access_tokens.prompt_copy_token"
            )}
            type="text"
            readOnly
          ></ha-textfield>
          <div id="qr">
            ${this._qrCode
              ? this._qrCode
              : html`
                  <mwc-button @click=${this._generateQR}>
                    Generate QR code
                  </mwc-button>
                `}
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private async _generateQR() {
    const qrcode = await import("qrcode");
    const canvas = await qrcode.toCanvas(this._params!.token, {
      width: 180,
      errorCorrectionLevel: "Q",
    });
    const context = canvas.getContext("2d");

    const imageObj = new Image();
    imageObj.src = QR_LOGO_URL;
    await new Promise((resolve) => {
      imageObj.onload = resolve;
    });
    context.drawImage(
      imageObj,
      canvas.width / 3,
      canvas.height / 3,
      canvas.width / 3,
      canvas.height / 3
    );

    this._qrCode = html`<img src=${canvas.toDataURL()}></img>`;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        #qr {
          text-align: center;
        }
        ha-textfield {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-long-lived-access-token-dialog": HaLongLivedAccessTokenDialog;
  }
}
