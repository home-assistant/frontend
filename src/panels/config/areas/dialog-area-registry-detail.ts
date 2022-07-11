import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-alert";
import "../../../components/ha-textfield";
import "../../../components/ha-picture-upload";
import type { HaPictureUpload } from "../../../components/ha-picture-upload";
import { AreaRegistryEntryMutableParams } from "../../../data/area_registry";
import { CropOptions } from "../../../dialogs/image-cropper-dialog/show-image-cropper-dialog";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { AreaRegistryDetailDialogParams } from "./show-dialog-area-registry-detail";

const cropOptions: CropOptions = {
  round: false,
  type: "image/jpeg",
  quality: 0.75,
  aspectRatio: 1.78,
};

class DialogAreaDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _picture!: string | null;

  @state() private _error?: string;

  @state() private _params?: AreaRegistryDetailDialogParams;

  @state() private _submitting?: boolean;

  public async showDialog(
    params: AreaRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = this._params.entry ? this._params.entry.name : "";
    this._picture = this._params.entry?.picture || null;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const entry = this._params.entry;
    const nameInvalid = !this._isNameValid();
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          entry
            ? entry.name
            : this.hass.localize("ui.panel.config.areas.editor.default_name")
        )}
      >
        <div>
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <div class="form">
            ${entry
              ? html`
                  <div>
                    ${this.hass.localize(
                      "ui.panel.config.areas.editor.area_id"
                    )}:
                    ${entry.area_id}
                  </div>
                `
              : ""}

            <ha-textfield
              .value=${this._name}
              @input=${this._nameChanged}
              .label=${this.hass.localize("ui.panel.config.areas.editor.name")}
              .errorMessage=${this.hass.localize(
                "ui.panel.config.areas.editor.name_required"
              )}
              .invalid=${nameInvalid}
              dialogInitialFocus
            ></ha-textfield>
            <ha-picture-upload
              .hass=${this.hass}
              .value=${this._picture}
              crop
              .cropOptions=${cropOptions}
              @change=${this._pictureChanged}
            ></ha-picture-upload>
          </div>
        </div>
        ${entry
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click=${this._deleteEntry}
                .disabled=${this._submitting}
              >
                ${this.hass.localize("ui.panel.config.areas.editor.delete")}
              </mwc-button>
            `
          : html``}
        <mwc-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${nameInvalid || this._submitting}
        >
          ${entry
            ? this.hass.localize("ui.panel.config.areas.editor.update")
            : this.hass.localize("ui.panel.config.areas.editor.create")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _isNameValid() {
    return this._name.trim() !== "";
  }

  private _nameChanged(ev) {
    this._error = undefined;
    this._name = ev.target.value;
  }

  private _pictureChanged(ev: PolymerChangedEvent<string | null>) {
    this._error = undefined;
    this._picture = (ev.target as HaPictureUpload).value;
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      const values: AreaRegistryEntryMutableParams = {
        name: this._name.trim(),
        picture: this._picture,
      };
      if (this._params!.entry) {
        await this._params!.updateEntry!(values);
      } else {
        await this._params!.createEntry!(values);
      }
      this.closeDialog();
    } catch (err: any) {
      this._error =
        err.message ||
        this.hass.localize("ui.panel.config.areas.editor.unknown_error");
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteEntry() {
    this._submitting = true;
    try {
      if (await this._params!.removeEntry!()) {
        this.closeDialog();
      }
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-textfield {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-area-registry-detail": DialogAreaDetail;
  }
}

customElements.define("dialog-area-registry-detail", DialogAreaDetail);
