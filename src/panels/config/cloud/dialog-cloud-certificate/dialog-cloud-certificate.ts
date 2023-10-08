import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
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
      return nothing;
    }
    const { certificateInfo } = this._params;

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            "ui.panel.config.cloud.dialog_certificate.certificate_information"
          )
        )}
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
