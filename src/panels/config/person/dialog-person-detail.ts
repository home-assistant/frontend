import {
  mdiCellphoneLink,
  mdiContentCopy,
  mdiDotsVertical,
  mdiPencil,
  mdiShieldAccount,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entities-picker";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon-button";
import "../../../components/ha-wa-dialog";
import "../../../components/ha-password-field";
import "../../../components/ha-picture-upload";
import type { HaPictureUpload } from "../../../components/ha-picture-upload";
import "../../../components/ha-settings-row";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import "../../../components/ha-textfield";
import { adminChangeUsername, createAuthForUser } from "../../../data/auth";
import type { PersonMutableParams } from "../../../data/person";
import type { User } from "../../../data/user";
import {
  createUser,
  deleteUser,
  SYSTEM_GROUP_ID_ADMIN,
  SYSTEM_GROUP_ID_USER,
  updateUser,
} from "../../../data/user";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { CropOptions } from "../../../dialogs/image-cropper-dialog/show-image-cropper-dialog";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import { showAdminChangePasswordDialog } from "../users/show-dialog-admin-change-password";
import type { PersonDetailDialogParams } from "./show-dialog-person-detail";

const includeDomains = ["device_tracker"];

const cropOptions: CropOptions = {
  round: true,
  quality: 0.75,
  aspectRatio: 1,
};

@customElement("dialog-person-detail")
class DialogPersonDetail extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _userId?: string;

  @state() private _user?: User;

  @state() private _isAdmin?: boolean;

  @state() private _isActive?: boolean;

  @state() private _localOnly?: boolean;

  @state() private _deviceTrackers!: string[];

  @state() private _picture!: string | null;

  @state() private _error?: string;

  @state() private _params?: PersonDetailDialogParams;

  @state() private _open = false;

  @state() private _submitting = false;

  @state() private _personExists = false;

  @state() private _pendingUserCreation = false;

  @state() private _username = "";

  @state() private _password = "";

  @state() private _passwordConfirm = "";

  private _deviceTrackersAvailable = memoizeOne((hass) =>
    Object.keys(hass.states).some(
      (entityId) =>
        entityId.substr(0, entityId.indexOf(".")) === "device_tracker"
    )
  );

  public async showDialog(params: PersonDetailDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._pendingUserCreation = false;
    this._username = "";
    this._password = "";
    this._passwordConfirm = "";
    if (this._params.entry) {
      this._personExists = true;
      this._name = this._params.entry.name || "";
      this._userId = this._params.entry.user_id || undefined;
      this._deviceTrackers = this._params.entry.device_trackers || [];
      this._picture = this._params.entry.picture || null;
      this._user = this._userId
        ? this._params.users?.find((user) => user.id === this._userId)
        : undefined;
      this._isAdmin = this._user?.group_ids.includes(SYSTEM_GROUP_ID_ADMIN);
      this._isActive = this._user?.is_active;
      this._localOnly = this._user?.local_only;
    } else {
      this._personExists = false;
      this._name = "";
      this._userId = undefined;
      this._user = undefined;
      this._isAdmin = undefined;
      this._isActive = undefined;
      this._localOnly = undefined;
      this._deviceTrackers = [];
      this._picture = null;
    }
    this._open = true;
    await this.updateComplete;
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    // If we do not have a person ID yet (= person creation dialog was just cancelled), but
    // we already created a user ID for it, delete it now to not have it "free floating".
    // Skip if _pendingUserCreation — no user was created on the server yet.
    if (!this._personExists && this._userId && !this._pendingUserCreation) {
      const callback = this._params?.refreshUsers;
      deleteUser(this.hass, this._userId).then(() => {
        callback?.();
      });
      this._userId = undefined;
    }
    this._params = undefined;
    this._pendingUserCreation = false;
    this._username = "";
    this._password = "";
    this._passwordConfirm = "";
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const nameInvalid = this._name.trim() === "";
    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        @closed=${this._dialogClosed}
        header-title=${this._params.entry
          ? this.hass!.localize("ui.panel.config.person.detail.edit_person", {
              name: this._params.entry.name,
            })
          : this.hass!.localize("ui.panel.config.person.detail.new_person")}
      >
        ${this._params.entry
          ? html`
              <ha-dropdown
                slot="headerActionItems"
                @wa-select=${this._handleOverflowAction}
              >
                <ha-icon-button
                  .path=${mdiDotsVertical}
                  slot="trigger"
                  .label=${this.hass.localize("ui.common.menu")}
                ></ha-icon-button>
                <ha-dropdown-item value="copy_id">
                  <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
                  ${this.hass.localize("ui.panel.config.person.detail.copy_id")}
                </ha-dropdown-item>
              </ha-dropdown>
            `
          : nothing}
        ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
        <div class="form">
          <ha-picture-upload
            .hass=${this.hass}
            .value=${this._picture}
            crop
            select-media
            .cropOptions=${cropOptions}
            @change=${this._pictureChanged}
          ></ha-picture-upload>

          <ha-textfield
            autofocus
            .value=${this._name}
            @input=${this._nameChanged}
            label=${this.hass!.localize("ui.panel.config.person.detail.name")}
            .validationMessage=${this.hass!.localize(
              "ui.panel.config.person.detail.name_error_msg"
            )}
            required
          ></ha-textfield>

          <ha-expansion-panel
            .header=${this.hass!.localize(
              "ui.panel.config.person.detail.section_access"
            )}
            outlined
            expanded
            left-chevron
          >
            <ha-svg-icon
              slot="leading-icon"
              .path=${mdiShieldAccount}
            ></ha-svg-icon>
            <ha-settings-row>
              <span slot="heading">
                ${this.hass!.localize(
                  "ui.panel.config.person.detail.allow_login"
                )}
              </span>
              <span slot="description">
                ${this.hass!.localize(
                  "ui.panel.config.person.detail.allow_login_description"
                )}
              </span>
              <ha-switch
                @change=${this._allowLoginChanged}
                .disabled=${this._user &&
                (this._user.id === this.hass.user?.id ||
                  this._user.system_generated ||
                  this._user.is_owner)}
                .checked=${!!this._userId || this._pendingUserCreation}
              ></ha-switch>
            </ha-settings-row>

            ${this._renderUserFields()}
          </ha-expansion-panel>

          <ha-expansion-panel
            .header=${this.hass!.localize(
              "ui.panel.config.person.detail.section_devices"
            )}
            outlined
            expanded
            left-chevron
          >
            <ha-svg-icon
              slot="leading-icon"
              .path=${mdiCellphoneLink}
            ></ha-svg-icon>
            ${this._deviceTrackersAvailable(this.hass)
              ? html`
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.person.detail.device_tracker_intro"
                    )}
                  </p>
                  <ha-entities-picker
                    .hass=${this.hass}
                    .value=${this._deviceTrackers}
                    .includeDomains=${includeDomains}
                    .pickedEntityLabel=${this.hass.localize(
                      "ui.panel.config.person.detail.device_tracker_picked"
                    )}
                    .pickEntityLabel=${this.hass.localize(
                      "ui.panel.config.person.detail.device_tracker_pick"
                    )}
                    @value-changed=${this._deviceTrackersChanged}
                  >
                  </ha-entities-picker>
                `
              : html`
                  <p>
                    ${this.hass!.localize(
                      "ui.panel.config.person.detail.no_device_tracker_available_intro"
                    )}
                  </p>
                  <ul>
                    <li>
                      <a
                        href=${documentationUrl(
                          this.hass,
                          "/integrations/#presence-detection"
                        )}
                        target="_blank"
                        rel="noreferrer"
                        >${this.hass!.localize(
                          "ui.panel.config.person.detail.link_presence_detection_integrations"
                        )}</a
                      >
                    </li>
                    <li>
                      <a @click=${this.closeDialog} href="/config/integrations">
                        ${this.hass!.localize(
                          "ui.panel.config.person.detail.link_integrations_page"
                        )}</a
                      >
                    </li>
                  </ul>
                `}
          </ha-expansion-panel>
        </div>
        <ha-dialog-footer slot="footer">
          ${this._params.entry
            ? html`
                <ha-button
                  slot="secondaryAction"
                  class="delete-btn"
                  variant="danger"
                  appearance="plain"
                  @click=${this._deleteEntry}
                  .disabled=${(this._user && this._user.is_owner) ||
                  this._submitting}
                >
                  ${this.hass!.localize("ui.panel.config.person.detail.delete")}
                </ha-button>
              `
            : nothing}
          <ha-button
            slot="primaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass!.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._updateEntry}
            .disabled=${nameInvalid ||
            this._submitting ||
            (this._pendingUserCreation &&
              (!this._username ||
                !this._password ||
                this._password !== this._passwordConfirm))}
          >
            ${this._params.entry
              ? this.hass!.localize("ui.common.save")
              : this.hass!.localize("ui.common.add")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _renderUserFields() {
    if (this._user) {
      return this._renderExistingUserFields();
    }
    if (this._pendingUserCreation) {
      return this._renderNewUserFields();
    }
    return nothing;
  }

  private _renderExistingUserFields() {
    const user = this._user!;
    return html`
      <ha-settings-row>
        <span slot="heading">
          ${this.hass.localize("ui.panel.config.person.detail.active")}
        </span>
        <span slot="description">
          ${this.hass.localize(
            "ui.panel.config.person.detail.active_description"
          )}
        </span>
        <ha-switch
          .disabled=${user.system_generated || user.is_owner}
          .checked=${this._isActive}
          @change=${this._activeChanged}
        >
        </ha-switch>
      </ha-settings-row>
      ${!user.system_generated
        ? html`
            <ha-settings-row>
              <span slot="heading">
                ${this.hass.localize("ui.panel.config.person.detail.username")}
              </span>
              <span slot="description">${user.username}</span>
              ${this.hass.user?.is_owner
                ? html`
                    <ha-icon-button
                      .path=${mdiPencil}
                      @click=${this._changeUsername}
                      .label=${this.hass.localize(
                        "ui.panel.config.person.detail.change_username"
                      )}
                    >
                    </ha-icon-button>
                  `
                : nothing}
            </ha-settings-row>
          `
        : nothing}
      ${!user.system_generated && this.hass.user?.is_owner
        ? html`
            <ha-settings-row>
              <span slot="heading">
                ${this.hass.localize("ui.panel.config.person.detail.password")}
              </span>
              <span slot="description">************</span>
              <ha-icon-button
                .path=${mdiPencil}
                @click=${this._changePassword}
                .label=${this.hass.localize(
                  "ui.panel.config.person.detail.change_password"
                )}
              >
              </ha-icon-button>
            </ha-settings-row>
          `
        : nothing}
      <ha-settings-row>
        <span slot="heading">
          ${this.hass.localize(
            "ui.panel.config.person.detail.local_access_only"
          )}
        </span>
        <span slot="description">
          ${this.hass.localize(
            "ui.panel.config.person.detail.local_access_only_description"
          )}
        </span>
        <ha-switch
          .disabled=${user.system_generated}
          .checked=${this._localOnly}
          @change=${this._localOnlyChanged}
        >
        </ha-switch>
      </ha-settings-row>
      <ha-settings-row>
        <span slot="heading">
          ${this.hass.localize("ui.panel.config.person.detail.admin")}
        </span>
        <span slot="description">
          ${this.hass.localize(
            "ui.panel.config.person.detail.admin_description"
          )}
        </span>
        <ha-switch
          .disabled=${user.system_generated || user.is_owner}
          .checked=${this._isAdmin}
          @change=${this._adminChanged}
        >
        </ha-switch>
      </ha-settings-row>
    `;
  }

  private _renderNewUserFields() {
    return html`
      <ha-textfield
        name="username"
        .value=${this._username}
        .label=${this.hass.localize("ui.panel.config.person.detail.username")}
        required
        @input=${this._usernameChanged}
        .validationMessage=${this.hass.localize("ui.common.error_required")}
      ></ha-textfield>

      <ha-password-field
        name="password"
        .label=${this.hass.localize("ui.panel.config.users.add_user.password")}
        .value=${this._password}
        required
        @input=${this._passwordChanged}
        .validationMessage=${this.hass.localize("ui.common.error_required")}
      ></ha-password-field>

      <ha-password-field
        name="passwordConfirm"
        .label=${this.hass.localize(
          "ui.panel.config.users.add_user.password_confirm"
        )}
        .value=${this._passwordConfirm}
        required
        @input=${this._passwordConfirmChanged}
        .invalid=${this._password !== "" &&
        this._passwordConfirm !== "" &&
        this._passwordConfirm !== this._password}
        .errorMessage=${this.hass.localize(
          "ui.panel.config.users.add_user.password_not_match"
        )}
      ></ha-password-field>

      <ha-settings-row>
        <span slot="heading">
          ${this.hass.localize(
            "ui.panel.config.person.detail.local_access_only"
          )}
        </span>
        <span slot="description">
          ${this.hass.localize(
            "ui.panel.config.person.detail.local_access_only_description"
          )}
        </span>
        <ha-switch
          .checked=${this._localOnly}
          @change=${this._localOnlyChanged}
        >
        </ha-switch>
      </ha-settings-row>

      <ha-settings-row>
        <span slot="heading">
          ${this.hass.localize("ui.panel.config.person.detail.admin")}
        </span>
        <span slot="description">
          ${this.hass.localize(
            "ui.panel.config.person.detail.admin_description"
          )}
        </span>
        <ha-switch .checked=${this._isAdmin} @change=${this._adminChanged}>
        </ha-switch>
      </ha-settings-row>
    `;
  }

  private async _handleOverflowAction(ev) {
    const value = ev.detail.item.value;
    if (value === "copy_id") {
      await copyToClipboard(this._params!.entry!.id);
      showToast(this, {
        message: this.hass.localize("ui.common.copied_clipboard"),
      });
    }
  }

  private _nameChanged(ev) {
    this._error = undefined;
    this._name = ev.target.value;
    if (this._pendingUserCreation) {
      this._maybePopulateUsername();
    }
  }

  private _maybePopulateUsername(): void {
    if (this._username || !this._name) {
      return;
    }
    const parts = this._name.split(" ");
    if (parts.length) {
      this._username = parts[0].toLowerCase();
    }
  }

  private _usernameChanged(ev): void {
    this._error = undefined;
    this._username = ev.target.value;
  }

  private _passwordChanged(ev): void {
    this._error = undefined;
    this._password = ev.target.value;
  }

  private _passwordConfirmChanged(ev): void {
    this._error = undefined;
    this._passwordConfirm = ev.target.value;
  }

  private _adminChanged(ev): void {
    this._isAdmin = ev.target.checked;
  }

  private _activeChanged(ev): void {
    this._isActive = ev.target.checked;
  }

  private _localOnlyChanged(ev): void {
    this._localOnly = ev.target.checked;
  }

  private async _allowLoginChanged(ev): Promise<void> {
    const target = ev.target;
    if (target.checked) {
      // Show inline user creation fields instead of opening a second dialog
      this._pendingUserCreation = true;
      this._username = "";
      this._password = "";
      this._passwordConfirm = "";
      this._isAdmin = false;
      this._isActive = true;
      this._localOnly = false;
      this._maybePopulateUsername();
    } else if (this._pendingUserCreation) {
      // User creation was pending but never saved — just clear inline fields
      this._pendingUserCreation = false;
      this._username = "";
      this._password = "";
      this._passwordConfirm = "";
      this._isAdmin = undefined;
      this._isActive = undefined;
      this._localOnly = undefined;
    } else if (this._userId) {
      if (
        !(await showConfirmationDialog(this, {
          title: this.hass!.localize(
            "ui.panel.config.person.detail.confirm_delete_user_title"
          ),
          text: this.hass!.localize(
            "ui.panel.config.person.detail.confirm_delete_user_text",
            { name: this._name }
          ),
          confirmText: this.hass!.localize("ui.common.delete"),
          dismissText: this.hass!.localize("ui.common.cancel"),
          destructive: true,
        }))
      ) {
        target.checked = true;
        return;
      }
      await deleteUser(this.hass, this._userId);
      this._params?.refreshUsers?.();
      this._userId = undefined;
      this._user = undefined;
      this._isAdmin = undefined;
      this._isActive = undefined;
      this._localOnly = undefined;
    }
  }

  private _deviceTrackersChanged(ev: ValueChangedEvent<string[]>) {
    this._error = undefined;
    this._deviceTrackers = ev.detail.value;
  }

  private _pictureChanged(ev: ValueChangedEvent<string | null>) {
    this._error = undefined;
    this._picture = (ev.target as HaPictureUpload).value;
  }

  private async _changePassword() {
    if (!this._user) {
      return;
    }
    const credential = this._user.credentials.find(
      (cred) => cred.type === "homeassistant"
    );
    if (!credential) {
      showAlertDialog(this, {
        title: "No Home Assistant credentials found.",
      });
      return;
    }
    showAdminChangePasswordDialog(this, { userId: this._user.id });
  }

  private async _changeUsername() {
    if (!this._user) {
      return;
    }
    const credential = this._user.credentials.find(
      (cred) => cred.type === "homeassistant"
    );
    if (!credential) {
      showAlertDialog(this, {
        title: "No Home Assistant credentials found.",
      });
      return;
    }

    const newUsername = await showPromptDialog(this, {
      inputLabel: this.hass.localize(
        "ui.panel.config.users.change_username.new_username"
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.users.change_username.change"
      ),
      title: this.hass.localize(
        "ui.panel.config.users.change_username.caption"
      ),
      defaultValue: this._user.username!,
    });
    if (newUsername) {
      try {
        await adminChangeUsername(this.hass, this._user.id, newUsername);
        this._params?.refreshUsers?.();
        this._user = { ...this._user, username: newUsername };
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.panel.config.users.change_username.username_changed"
          ),
        });
      } catch (err: any) {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.users.change_username.failed"
          ),
          text: err.message,
        });
      }
    }
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      // Handle inline user creation
      if (this._pendingUserCreation) {
        if (this._password !== this._passwordConfirm) {
          this._error = this.hass.localize(
            "ui.panel.config.users.add_user.password_not_match"
          );
          return;
        }

        let user: User;
        try {
          const userResponse = await createUser(
            this.hass,
            this._name.trim(),
            [this._isAdmin ? SYSTEM_GROUP_ID_ADMIN : SYSTEM_GROUP_ID_USER],
            this._localOnly
          );
          user = userResponse.user;
        } catch (err: any) {
          this._error = err.message;
          return;
        }

        try {
          await createAuthForUser(
            this.hass,
            user.id,
            this._username,
            this._password
          );
        } catch (err: any) {
          await deleteUser(this.hass, user.id);
          this._error = err.message;
          return;
        }

        user.username = this._username;
        user.credentials = [{ type: "homeassistant" }];

        this._userId = user.id;
        this._user = user;
        this._pendingUserCreation = false;
        this._params?.refreshUsers?.();

        if (this._params!.entry && this._params!.updateEntry) {
          await this._params!.updateEntry({ user_id: user.id });
        }
      }

      if (
        this._userId &&
        this._user &&
        (this._name !== this._params!.entry?.name ||
          this._isAdmin !==
            this._user.group_ids.includes(SYSTEM_GROUP_ID_ADMIN) ||
          this._isActive !== this._user.is_active ||
          this._localOnly !== this._user.local_only)
      ) {
        await updateUser(this.hass!, this._userId!, {
          name: this._name.trim(),
          is_active: this._isActive,
          group_ids: [
            this._isAdmin ? SYSTEM_GROUP_ID_ADMIN : SYSTEM_GROUP_ID_USER,
          ],
          local_only: this._localOnly,
        });
        this._params?.refreshUsers?.();
      }
      const values: PersonMutableParams = {
        name: this._name.trim(),
        device_trackers: this._deviceTrackers,
        user_id: this._userId || null,
        picture: this._picture,
      };
      if (this._params!.entry) {
        await this._params!.updateEntry?.(values);
      } else {
        await this._params!.createEntry?.(values);
        this._personExists = true;
      }
      this.closeDialog();
    } catch (err: any) {
      this._error = err ? err.message : "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteEntry() {
    this._submitting = true;
    try {
      if (await this._params!.removeEntry?.()) {
        if (this._params!.entry!.user_id) {
          deleteUser(this.hass, this._params!.entry!.user_id);
        }
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
        ha-expansion-panel {
          margin-bottom: var(--ha-space-3);
          --expansion-panel-content-padding: 0 var(--ha-space-4)
            var(--ha-space-4);
        }
        ha-picture-upload,
        ha-textfield,
        ha-password-field {
          display: block;
        }
        ha-picture-upload {
          height: 120px;
          margin-bottom: var(--ha-space-4);
          --file-upload-image-border-radius: var(--ha-border-radius-circle);
        }
        ha-settings-row {
          padding: 0;
        }
        a {
          color: var(--primary-color);
        }
        p {
          color: var(--primary-text-color);
        }
        .delete-btn {
          margin-inline-end: auto;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-person-detail": DialogPersonDetail;
  }
}
