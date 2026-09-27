import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-alert";
import "../../components/ha-button";
import "../../components/ha-dialog";
import "../../components/ha-dialog-footer";
import "../../components/ha-picture-upload";
import type { HaPictureUpload } from "../../components/ha-picture-upload";
import "../../components/input/ha-input";
import type { HaInput } from "../../components/input/ha-input";
import type { OwnProfileMutableParams } from "../../data/person";
import { getUserPerson, updateOwnProfile } from "../../data/person";
import type { HassDialog } from "../../dialogs/make-dialog-manager";
import type { CropOptions } from "../../dialogs/image-cropper-dialog/show-image-cropper-dialog";
import { DirtyStateProviderMixin } from "../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";

const cropOptions: CropOptions = {
  round: true,
  quality: 0.75,
  aspectRatio: 1,
};

interface ProfileFormState {
  name: string;
  picture: string | null;
}

// Uses the legacy dialog lifecycle, as ha-picture-upload needs `hass`,
// which the dialog manager only provides to legacy dialogs.
@customElement("dialog-edit-profile")
class DialogEditProfile
  extends DirtyStateProviderMixin<ProfileFormState>()(LitElement)
  implements HassDialog
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  // Kept until the close animation finishes, so ha-dialog can fire `closed`
  @state() private _rendered = false;

  @state() private _name = "";

  @state() private _picture: string | null = null;

  private _initialPicture: string | null = null;

  @state() private _hasPerson = false;

  @state() private _pictureEditable = false;

  @state() private _error?: string;

  @state() private _submitting = false;

  public async showDialog(): Promise<void> {
    const person = getUserPerson(this.hass);
    this._name = this.hass.user?.name ?? "";
    this._picture = (person?.attributes.entity_picture as string) || null;
    this._initialPicture = this._picture;
    this._hasPerson = !!person;
    this._pictureEditable = !!person?.attributes.editable;
    this._error = undefined;
    this._rendered = true;
    this._open = true;
    this._initDirtyTracking({ type: "shallow" }, this._currentState());
    await this.updateComplete;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._error = undefined;
    this._rendered = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _currentState(): ProfileFormState {
    return { name: this._name, picture: this._picture };
  }

  protected render() {
    if (!this._rendered) {
      return nothing;
    }
    const nameInvalid = this._name.trim() === "";

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.profile.edit_profile.title"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        <div class="form">
          ${
            this._pictureEditable
              ? html`
                  <ha-picture-upload
                    .hass=${this.hass}
                    .value=${this._picture}
                    crop
                    .cropOptions=${cropOptions}
                    @change=${this._pictureChanged}
                  ></ha-picture-upload>
                `
              : html`
                  <ha-alert alert-type="info">
                    ${this.hass.localize(
                      this._hasPerson
                        ? "ui.panel.profile.edit_profile.picture_not_editable"
                        : "ui.panel.profile.edit_profile.no_person"
                    )}
                  </ha-alert>
                `
          }
          <ha-input
            .value=${this._name}
            @input=${this._nameChanged}
            .label=${this.hass.localize("ui.panel.profile.edit_profile.name")}
            .hint=${this.hass.localize(
              "ui.panel.profile.edit_profile.name_helper"
            )}
            .validationMessage=${this.hass.localize(
              "ui.panel.profile.edit_profile.name_error_msg"
            )}
            required
            autofocus
          ></ha-input>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${nameInvalid || this._submitting || !this.isDirtyState}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _nameChanged(ev: InputEvent) {
    this._error = undefined;
    this._name = (ev.target as HaInput).value ?? "";
    this._updateDirtyState(this._currentState());
  }

  private _pictureChanged(ev: Event) {
    this._error = undefined;
    this._picture = (ev.target as HaPictureUpload).value;
    this._updateDirtyState(this._currentState());
  }

  private async _save() {
    const updates: Partial<OwnProfileMutableParams> = {};
    const name = this._name.trim();
    if (name !== this.hass.user?.name) {
      updates.name = name;
    }
    // Only send the picture when it changed, as a picture set by an
    // administrator may not be one users are allowed to set themselves.
    if (this._picture !== this._initialPicture) {
      updates.picture = this._picture;
    }

    this._submitting = true;
    try {
      await updateOwnProfile(this.hass, updates);
    } catch (err: any) {
      this._error =
        err.message || this.hass.localize("ui.common.unknown_error");
      return;
    } finally {
      this._submitting = false;
    }

    if (updates.name) {
      fireEvent(this, "hass-refresh-current-user");
    }
    this._markDirtyStateClean();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-picture-upload {
          display: block;
          margin-bottom: var(--ha-space-4);
          --file-upload-image-border-radius: var(--ha-border-radius-circle);
        }
        ha-alert {
          display: block;
          margin-bottom: var(--ha-space-4);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-edit-profile": DialogEditProfile;
  }
}
