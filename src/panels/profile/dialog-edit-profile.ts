import type { ContextType } from "@lit/context";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../common/decorators/consume";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import "../../components/ha-alert";
import "../../components/ha-button";
import "../../components/ha-dialog";
import "../../components/ha-dialog-footer";
import "../../components/ha-picture-upload";
import type { HaPictureUpload } from "../../components/ha-picture-upload";
import "../../components/input/ha-input";
import type { HaInput } from "../../components/input/ha-input";
import {
  apiContext,
  configContext,
  connectionContext,
  internationalizationContext,
  statesContext,
} from "../../data/context";
import type { OwnProfileMutableParams } from "../../data/person";
import { getUserPerson, updateOwnProfile } from "../../data/person";
import { userCollection } from "../../data/ws-user";
import { DialogMixin } from "../../dialogs/dialog-mixin";
import type { CropOptions } from "../../dialogs/image-cropper-dialog/show-image-cropper-dialog";
import { DirtyStateProviderMixin } from "../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../resources/styles";

const cropOptions: CropOptions = {
  round: true,
  quality: 0.75,
  aspectRatio: 1,
};

interface ProfileFormState {
  name: string;
  picture: string | null;
}

@customElement("dialog-edit-profile")
class DialogEditProfile extends DirtyStateProviderMixin<ProfileFormState>()(
  DialogMixin(LitElement)
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @consume({ context: configContext, subscribe: true })
  private _hassConfig!: ContextType<typeof configContext>;

  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state() private _name = "";

  @state() private _picture: string | null = null;

  private _initialPicture: string | null = null;

  @state() private _hasPerson = false;

  @state() private _pictureEditable = false;

  @state() private _error?: string;

  @state() private _submitting = false;

  @state() private _uploading = false;

  public connectedCallback(): void {
    super.connectedCallback();
    const user = this._hassConfig.user;
    const person = getUserPerson(user?.id, this._states);
    this._name = user?.name ?? "";
    this._picture = (person?.attributes.entity_picture as string) || null;
    this._initialPicture = this._picture;
    this._hasPerson = !!person;
    this._pictureEditable = !!person?.attributes.editable;
    this._initDirtyTracking(
      { type: "shallow" },
      { name: this._name, picture: this._picture }
    );
  }

  protected render() {
    const nameInvalid = this._name.trim() === "";

    return html`
      <ha-dialog
        open
        header-title=${this._i18n.localize(
          "ui.panel.profile.edit_profile.title"
        )}
        .preventScrimClose=${this.isDirtyState}
      >
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        <div class="form" ?inert=${this._submitting}>
          ${
            this._pictureEditable
              ? html`
                  <ha-picture-upload
                    .value=${this._picture}
                    crop
                    .cropOptions=${cropOptions}
                    @change=${this._pictureChanged}
                    @uploading-changed=${this._uploadingChanged}
                  ></ha-picture-upload>
                `
              : html`
                  <ha-alert alert-type="info">
                    ${this._i18n.localize(
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
            .label=${this._i18n.localize("ui.panel.profile.edit_profile.name")}
            .hint=${
              this._pictureEditable
                ? this._i18n.localize(
                    "ui.panel.profile.edit_profile.name_helper"
                  )
                : this._hasPerson
                  ? this._i18n.localize(
                      "ui.panel.profile.edit_profile.name_helper_yaml"
                    )
                  : undefined
            }
            .validationMessage=${this._i18n.localize(
              "ui.panel.profile.edit_profile.name_error_msg"
            )}
            required
            auto-validate
            autofocus
          ></ha-input>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this._i18n.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${nameInvalid || !this.isDirtyState}
            .loading=${this._submitting || this._uploading}
          >
            ${this._i18n.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _nameChanged(ev: InputEvent) {
    this._error = undefined;
    this._name = (ev.target as HaInput).value ?? "";
    this._updateDirtyState({ name: this._name, picture: this._picture });
  }

  private _pictureChanged(ev: Event) {
    this._error = undefined;
    this._picture = (ev.target as HaPictureUpload).value;
    this._updateDirtyState({ name: this._name, picture: this._picture });
  }

  private _uploadingChanged(ev: HASSDomEvent<{ uploading: boolean }>) {
    this._uploading = ev.detail.uploading;
  }

  private async _save() {
    const updates: Partial<OwnProfileMutableParams> = {};
    const name = this._name.trim();
    if (name !== this._hassConfig.user?.name) {
      updates.name = name;
    }
    // Only send the picture when it has changed. An administrator may have set
    // the existing picture to a value that users are not allowed to set themselves.
    if (this._picture !== this._initialPicture) {
      updates.picture = this._picture;
    }

    this._submitting = true;
    try {
      await updateOwnProfile(this._api.callWS, updates);
    } catch (err: any) {
      this._error =
        err.message || this._i18n.localize("ui.common.unknown_error");
      this._submitting = false;
      return;
    }

    if (updates.name) {
      // Refresh directly, as the dialog may already be closed and detached.
      userCollection(this._connection.connection).refresh();
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
