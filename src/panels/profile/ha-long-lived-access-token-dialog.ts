import "@material/mwc-button";
import { mdiContentCopy } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-textfield";
import "../../components/ha-icon-button";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { LongLivedAccessTokenDialogParams } from "./show-long-lived-access-token-dialog";
import type { HaTextField } from "../../components/ha-textfield";
import { copyToClipboard } from "../../common/util/copy-clipboard";
import { showToast } from "../../util/toast";

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

  protected render() {
    if (!this._params || !this._params.token) {
      return nothing;
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
            iconTrailing
            readOnly
          >
            <ha-icon-button
              @click=${this._copyToken}
              slot="trailingIcon"
              .path=${mdiContentCopy}
            ></ha-icon-button>
          </ha-textfield>
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

  private async _copyToken(ev): Promise<void> {
    const textField = ev.target.parentElement as HaTextField;
    await copyToClipboard(textField.value);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
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
    context?.drawImage(
      imageObj,
      canvas.width / 3,
      canvas.height / 3,
      canvas.width / 3,
      canvas.height / 3
    );

    this._qrCode = html`<img
        alt=${this.hass.localize(
          "ui.panel.profile.long_lived_access_tokens.qr_code_image",
          "name",
          this._params!.name
        )}
        src=${canvas.toDataURL()}
      ></img>`;
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
          --textfield-icon-trailing-padding: 0;
        }
        ha-textfield > ha-icon-button {
          position: relative;
          right: -8px;
          --mdc-icon-button-size: 36px;
          --mdc-icon-size: 20px;
          color: var(--secondary-text-color);
          inset-inline-start: initial;
          inset-inline-end: -8px;
          direction: var(--direction);
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
