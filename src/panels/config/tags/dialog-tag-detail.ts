import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-formfield";
import "../../../components/ha-switch";
import { Tag, UpdateTagParams } from "../../../data/tag";
import { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { TagDetailDialogParams } from "./show-dialog-tag-detail";

const QR_LOGO_URL = "/static/icons/favicon-192x192.png";

@customElement("dialog-tag-detail")
class DialogTagDetail
  extends LitElement
  implements HassDialog<TagDetailDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _id?: string;

  @state() private _name!: string;

  @state() private _error?: string;

  @state() private _params?: TagDetailDialogParams;

  @state() private _submitting = false;

  @state() private _qrCode?: TemplateResult;

  public showDialog(params: TagDetailDialogParams): void {
    this._params = params;
    this._error = undefined;
    if (this._params.entry) {
      this._name = this._params.entry.name || "";
    } else {
      this._id = "";
      this._name = "";
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    this._qrCode = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._params.entry
            ? this._params.entry.name || this._params.entry.id
            : this.hass!.localize("ui.panel.config.tag.detail.new_tag")
        )}
      >
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          <div class="form">
            ${this._params.entry
              ? html`${this.hass!.localize(
                  "ui.panel.config.tag.detail.tag_id"
                )}:
                ${this._params.entry.id}`
              : ""}
            <paper-input
              dialogInitialFocus
              .value=${this._name}
              .configValue=${"name"}
              @value-changed=${this._valueChanged}
              .label="${this.hass!.localize("ui.panel.config.tag.detail.name")}"
              .errorMessage="${this.hass!.localize(
                "ui.panel.config.tag.detail.required_error_msg"
              )}"
              required
              auto-validate
            ></paper-input>
            ${!this._params.entry
              ? html` <paper-input
                  .value=${this._id}
                  .configValue=${"id"}
                  @value-changed=${this._valueChanged}
                  .label=${this.hass!.localize(
                    "ui.panel.config.tag.detail.tag_id"
                  )}
                  .placeholder=${this.hass!.localize(
                    "ui.panel.config.tag.detail.tag_id_placeholder"
                  )}
                ></paper-input>`
              : ""}
          </div>
          ${this._params.entry
            ? html`
                <div>
                  <p>
                    ${this.hass!.localize(
                      "ui.panel.config.tag.detail.usage",
                      "companion_link",
                      html`<a
                        href="https://companion.home-assistant.io/"
                        target="_blank"
                        rel="noreferrer"
                        >${this.hass!.localize(
                          "ui.panel.config.tag.detail.companion_apps"
                        )}</a
                      >`
                    )}
                  </p>
                </div>

                <div id="qr">
                  ${this._qrCode
                    ? this._qrCode
                    : html`
                        <mwc-button @click=${this._generateQR}
                          >Generate QR code
                        </mwc-button>
                      `}
                </div>
              `
            : ``}
        </div>
        ${this._params.entry
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click="${this._deleteEntry}"
                .disabled=${this._submitting}
              >
                ${this.hass!.localize("ui.panel.config.tag.detail.delete")}
              </mwc-button>
            `
          : html``}
        <mwc-button
          slot="primaryAction"
          @click="${this._updateEntry}"
          .disabled=${this._submitting}
        >
          ${this._params.entry
            ? this.hass!.localize("ui.panel.config.tag.detail.update")
            : this.hass!.localize("ui.panel.config.tag.detail.create")}
        </mwc-button>
        ${this._params.openWrite && !this._params.entry
          ? html` <mwc-button
              slot="primaryAction"
              @click="${this._updateWriteEntry}"
              .disabled=${this._submitting}
            >
              ${this.hass!.localize(
                "ui.panel.config.tag.detail.create_and_write"
              )}
            </mwc-button>`
          : ""}
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    const configValue = (ev.target as any).configValue;

    this._error = undefined;
    this[`_${configValue}`] = ev.detail.value;
  }

  private async _updateEntry() {
    this._submitting = true;
    let newValue: Tag | undefined;
    try {
      const values: UpdateTagParams = {
        name: this._name.trim(),
      };
      if (this._params!.entry) {
        newValue = await this._params!.updateEntry!(values);
      } else {
        newValue = await this._params!.createEntry(values, this._id);
      }
      this.closeDialog();
    } catch (err) {
      this._error = err ? err.message : "Unknown error";
    } finally {
      this._submitting = false;
    }
    return newValue;
  }

  private async _updateWriteEntry() {
    const openWrite = this._params?.openWrite;
    const tag = await this._updateEntry();
    if (!tag || !openWrite) {
      return;
    }
    openWrite(tag);
  }

  private async _deleteEntry() {
    this._submitting = true;
    try {
      if (await this._params!.removeEntry!()) {
        this._params = undefined;
      }
    } finally {
      this._submitting = false;
    }
  }

  private async _generateQR() {
    const qrcode = await import("qrcode");
    const canvas = await qrcode.toCanvas(
      `https://www.home-assistant.io/tag/${this._params!.entry!.id}`,
      {
        width: 180,
        errorCorrectionLevel: "Q",
      }
    );
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
        a {
          color: var(--primary-color);
        }
        #qr {
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-tag-detail": DialogTagDetail;
  }
}
