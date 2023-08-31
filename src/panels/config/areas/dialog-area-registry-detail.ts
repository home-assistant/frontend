import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import { mdiPencil } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { stringCompare } from "../../../common/string/compare";
import "../../../components/ha-alert";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-picture-upload";
import type { HaPictureUpload } from "../../../components/ha-picture-upload";
import "../../../components/ha-textfield";
import { AreaRegistryEntryMutableParams } from "../../../data/area_registry";
import { showAliasesDialog } from "../../../dialogs/aliases/show-dialog-aliases";
import { CropOptions } from "../../../dialogs/image-cropper-dialog/show-image-cropper-dialog";
import { ValueChangedEvent, HomeAssistant } from "../../../types";
import { haStyleDialog } from "../../../resources/styles";
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

  @state() private _aliases!: string[];

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
    this._aliases = this._params.entry ? this._params.entry.aliases : [];
    this._picture = this._params.entry?.picture || null;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._error = "";
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
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
              .validationMessage=${this.hass.localize(
                "ui.panel.config.areas.editor.name_required"
              )}
              required
              dialogInitialFocus
            ></ha-textfield>

            <ha-picture-upload
              .hass=${this.hass}
              .value=${this._picture}
              crop
              .cropOptions=${cropOptions}
              @change=${this._pictureChanged}
            ></ha-picture-upload>

            <div class="label">
              ${this.hass.localize(
                "ui.panel.config.areas.editor.aliases_section"
              )}
            </div>
            <mwc-list class="aliases" @action=${this._handleAliasesClicked}>
              <mwc-list-item .twoline=${this._aliases.length > 0} hasMeta>
                <span>
                  ${this._aliases.length > 0
                    ? this.hass.localize(
                        "ui.panel.config.areas.editor.configured_aliases",
                        { count: this._aliases.length }
                      )
                    : this.hass.localize(
                        "ui.panel.config.areas.editor.no_aliases"
                      )}
                </span>
                <span slot="secondary">
                  ${[...this._aliases]
                    .sort((a, b) =>
                      stringCompare(a, b, this.hass.locale.language)
                    )
                    .join(", ")}
                </span>
                <ha-svg-icon slot="meta" .path=${mdiPencil}></ha-svg-icon>
              </mwc-list-item>
            </mwc-list>
            <div class="secondary">
              ${this.hass.localize(
                "ui.panel.config.areas.editor.aliases_description"
              )}
            </div>
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
          : nothing}
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

  private _handleAliasesClicked() {
    showAliasesDialog(this, {
      name: this._name,
      aliases: this._aliases,
      updateAliases: async (aliases: string[]) => {
        this._aliases = aliases;
      },
    });
  }

  private _isNameValid() {
    return this._name.trim() !== "";
  }

  private _nameChanged(ev) {
    this._error = undefined;
    this._name = ev.target.value;
  }

  private _pictureChanged(ev: ValueChangedEvent<string | null>) {
    this._error = undefined;
    this._picture = (ev.target as HaPictureUpload).value;
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      const values: AreaRegistryEntryMutableParams = {
        name: this._name.trim(),
        picture: this._picture,
        aliases: this._aliases,
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
        ha-textfield,
        ha-picture-upload {
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
