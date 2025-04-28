import { mdiPencil } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../components/entity/ha-entities-picker";
import "../../../components/ha-button";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-icon-button";
import "../../../components/ha-picture-upload";
import type { HaPictureUpload } from "../../../components/ha-picture-upload";
import "../../../components/ha-settings-row";
import "../../../components/ha-textfield";
import { adminChangeUsername } from "../../../data/auth";
import type { PersonMutableParams } from "../../../data/person";
import type { User } from "../../../data/user";
import {
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
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showAddUserDialog } from "../users/show-dialog-add-user";
import { showAdminChangePasswordDialog } from "../users/show-dialog-admin-change-password";
import type { PersonDetailDialogParams } from "./show-dialog-person-detail";
import { fireEvent } from "../../../common/dom/fire_event";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";

const includeDomains = ["device_tracker"];

const cropOptions: CropOptions = {
  round: true,
  quality: 0.75,
  aspectRatio: 1,
};

class DialogPersonDetail extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _userId?: string;

  @state() private _user?: User;

  @state() private _isAdmin?: boolean;

  @state() private _localOnly?: boolean;

  @state() private _deviceTrackers!: string[];

  @state() private _picture!: string | null;

  @state() private _error?: string;

  @state() private _params?: PersonDetailDialogParams;

  @state() private _submitting = false;

  @state() private _personExists = false;

  private _deviceTrackersAvailable = memoizeOne((hass) =>
    Object.keys(hass.states).some(
      (entityId) =>
        entityId.substr(0, entityId.indexOf(".")) === "device_tracker"
    )
  );

  public async showDialog(params: PersonDetailDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    if (this._params.entry) {
      this._personExists = true;
      this._name = this._params.entry.name || "";
      this._userId = this._params.entry.user_id || undefined;
      this._deviceTrackers = this._params.entry.device_trackers || [];
      this._picture = this._params.entry.picture || null;
      this._user = this._userId
        ? this._params.users.find((user) => user.id === this._userId)
        : undefined;
      this._isAdmin = this._user?.group_ids.includes(SYSTEM_GROUP_ID_ADMIN);
      this._localOnly = this._user?.local_only;
    } else {
      this._personExists = false;
      this._name = "";
      this._userId = undefined;
      this._user = undefined;
      this._isAdmin = undefined;
      this._localOnly = undefined;
      this._deviceTrackers = [];
      this._picture = null;
    }
    await this.updateComplete;
  }

  public closeDialog() {
    // If we do not have a person ID yet (= person creation dialog was just cancelled), but
    // we already created a user ID for it, delete it now to not have it "free floating".
    if (!this._personExists && this._userId) {
      const callback = this._params?.refreshUsers;
      deleteUser(this.hass, this._userId).then(() => {
        callback?.();
      });
      this._userId = undefined;
    }
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const nameInvalid = this._name.trim() === "";
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._params.entry
            ? this._params.entry.name
            : this.hass!.localize("ui.panel.config.person.detail.new_person")
        )}
      >
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          <div class="form">
            <ha-textfield
              dialogInitialFocus
              .value=${this._name}
              @input=${this._nameChanged}
              label=${this.hass!.localize("ui.panel.config.person.detail.name")}
              .validationMessage=${this.hass!.localize(
                "ui.panel.config.person.detail.name_error_msg"
              )}
              required
            ></ha-textfield>

            <ha-picture-upload
              .hass=${this.hass}
              .value=${this._picture}
              crop
              select-media
              .cropOptions=${cropOptions}
              @change=${this._pictureChanged}
            ></ha-picture-upload>

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
                .checked=${this._userId}
              ></ha-switch>
            </ha-settings-row>

            ${this._renderUserFields()}
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
          </div>
        </div>
        ${this._params.entry
          ? html`
              <ha-button
                slot="secondaryAction"
                class="warning"
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
          @click=${this._updateEntry}
          .disabled=${nameInvalid || this._submitting}
        >
          ${this._params.entry
            ? this.hass!.localize("ui.panel.config.person.detail.update")
            : this.hass!.localize("ui.panel.config.person.detail.create")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _renderUserFields() {
    const user = this._user;
    if (!user) return nothing;
    return html`
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
              ${this.hass.user?.is_owner
                ? html`
                    <ha-icon-button
                      .path=${mdiPencil}
                      @click=${this._changePassword}
                      .label=${this.hass.localize(
                        "ui.panel.config.person.detail.change_password"
                      )}
                    >
                    </ha-icon-button>
                  `
                : nothing}
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

  private _nameChanged(ev) {
    this._error = undefined;
    this._name = ev.target.value;
  }

  private _adminChanged(ev): void {
    this._isAdmin = ev.target.checked;
  }

  private _localOnlyChanged(ev): void {
    this._localOnly = ev.target.checked;
  }

  private async _allowLoginChanged(ev): Promise<void> {
    const target = ev.target;
    if (target.checked) {
      target.checked = false;
      showAddUserDialog(this, {
        userAddedCallback: async (user?: User) => {
          if (user) {
            target.checked = true;
            if (this._params!.entry) {
              await this._params!.updateEntry({ user_id: user.id });
            }
            this._params?.refreshUsers();
            this._user = user;
            this._userId = user.id;
            this._isAdmin = user.group_ids.includes(SYSTEM_GROUP_ID_ADMIN);
            this._localOnly = user.local_only;
          }
        },
        name: this._name,
      });
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
      this._params?.refreshUsers();
      this._userId = undefined;
      this._user = undefined;
      this._isAdmin = undefined;
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
        this._params?.refreshUsers();
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
      if (
        (this._userId && this._name !== this._params!.entry?.name) ||
        this._isAdmin !==
          this._user?.group_ids.includes(SYSTEM_GROUP_ID_ADMIN) ||
        this._localOnly !== this._user?.local_only
      ) {
        await updateUser(this.hass!, this._userId!, {
          name: this._name.trim(),
          group_ids: [
            this._isAdmin ? SYSTEM_GROUP_ID_ADMIN : SYSTEM_GROUP_ID_USER,
          ],
          local_only: this._localOnly,
        });
        this._params?.refreshUsers();
      }
      const values: PersonMutableParams = {
        name: this._name.trim(),
        device_trackers: this._deviceTrackers,
        user_id: this._userId || null,
        picture: this._picture,
      };
      if (this._params!.entry) {
        await this._params!.updateEntry(values);
      } else {
        await this._params!.createEntry(values);
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
      if (await this._params!.removeEntry()) {
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
        ha-picture-upload,
        ha-textfield {
          display: block;
        }
        ha-picture-upload {
          margin-bottom: 16px;
          --file-upload-image-border-radius: 50%;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-person-detail": DialogPersonDetail;
  }
}

customElements.define("dialog-person-detail", DialogPersonDetail);
