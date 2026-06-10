import { mdiPencil } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-icon-button";
import "../../../components/ha-label";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import "../../../components/input/ha-input";
import type { HaInput } from "../../../components/input/ha-input";
import "../../../components/item/ha-row-item";
import { adminChangeUsername } from "../../../data/auth";
import {
  computeUserBadges,
  SYSTEM_GROUP_ID_ADMIN,
  SYSTEM_GROUP_ID_USER,
} from "../../../data/user";
import {
  showAlertDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { DirtyStateProviderMixin } from "../../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showAdminChangePasswordDialog } from "./show-dialog-admin-change-password";
import type { UserDetailDialogParams } from "./show-dialog-user-detail";

interface UserDetailFormState {
  name: string;
  isAdmin?: boolean;
  localOnly?: boolean;
  isActive?: boolean;
}

@customElement("dialog-user-detail")
class DialogUserDetail extends DirtyStateProviderMixin<UserDetailFormState>()(
  DialogMixin<UserDetailDialogParams>(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _isAdmin?: boolean;

  @state() private _localOnly?: boolean;

  @state() private _isActive?: boolean;

  @state() private _error?: string;

  @state() private _submitting = false;

  public connectedCallback(): void {
    super.connectedCallback();
    const entry = this.params!.entry;
    this._error = undefined;
    this._name = entry.name || "";
    this._isAdmin = entry.group_ids.includes(SYSTEM_GROUP_ID_ADMIN);
    this._localOnly = entry.local_only;
    this._isActive = entry.is_active;

    this._initDirtyTracking(
      { type: "shallow" },
      {
        name: this._name,
        isAdmin: this._isAdmin,
        localOnly: this._localOnly,
        isActive: this._isActive,
      }
    );
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }
    const user = this.params.entry;
    const badges = computeUserBadges(this.hass, user, true);
    return html`
      <ha-dialog
        open
        .preventScrimClose=${this.isDirtyState}
        header-title=${user.name}
      >
        <div>
          ${this._error
            ? html`<div class="error">${this._error}</div>`
            : nothing}
          <div class="secondary">
            ${this.hass.localize("ui.panel.config.users.editor.id")}:
            ${user.id}<br />
          </div>
          ${badges.length === 0
            ? nothing
            : html`
                <div class="badge-container">
                  ${badges.map(
                    ([icon, label]) => html`
                      <ha-label>
                        <ha-svg-icon slot="icon" .path=${icon}></ha-svg-icon>
                        ${label}
                      </ha-label>
                    `
                  )}
                </div>
              `}
          <div class="form">
            ${!user.system_generated
              ? html`
                  <ha-input
                    autofocus
                    .value=${this._name}
                    @input=${this._nameChanged}
                    .label=${this.hass!.localize(
                      "ui.panel.config.users.editor.name"
                    )}
                  ></ha-input>
                  <ha-row-item>
                    <span slot="headline"
                      >${this.hass.localize(
                        "ui.panel.config.users.editor.username"
                      )}</span
                    >
                    <span slot="supporting-text">${user.username}</span>
                    ${this.hass.user?.is_owner
                      ? html`
                          <ha-icon-button
                            slot="end"
                            .path=${mdiPencil}
                            @click=${this._changeUsername}
                            .label=${this.hass.localize(
                              "ui.panel.config.users.editor.change_username"
                            )}
                          >
                          </ha-icon-button>
                        `
                      : nothing}
                  </ha-row-item>
                `
              : nothing}
            ${!user.system_generated && this.hass.user?.is_owner
              ? html`
                  <ha-row-item>
                    <span slot="headline"
                      >${this.hass.localize(
                        "ui.panel.config.users.editor.password"
                      )}</span
                    >
                    <span slot="supporting-text">************</span>
                    ${this.hass.user?.is_owner
                      ? html`
                          <ha-icon-button
                            slot="end"
                            .path=${mdiPencil}
                            @click=${this._changePassword}
                            .label=${this.hass.localize(
                              "ui.panel.config.users.editor.change_password"
                            )}
                          >
                          </ha-icon-button>
                        `
                      : nothing}
                  </ha-row-item>
                `
              : nothing}
            <ha-row-item>
              <span slot="headline"
                >${this.hass.localize(
                  "ui.panel.config.users.editor.active"
                )}</span
              >
              <span slot="supporting-text"
                >${this.hass.localize(
                  "ui.panel.config.users.editor.active_description"
                )}</span
              >
              <ha-switch
                slot="end"
                .disabled=${user.system_generated || user.is_owner}
                .checked=${this._isActive}
                @change=${this._activeChanged}
              ></ha-switch>
            </ha-row-item>
            <ha-row-item>
              <span slot="headline"
                >${this.hass.localize(
                  "ui.panel.config.users.editor.local_access_only"
                )}</span
              >
              <span slot="supporting-text"
                >${this.hass.localize(
                  "ui.panel.config.users.editor.local_access_only_description"
                )}</span
              >
              <ha-switch
                slot="end"
                .disabled=${user.system_generated}
                .checked=${this._localOnly}
                @change=${this._localOnlyChanged}
              ></ha-switch>
            </ha-row-item>
            <ha-row-item>
              <span slot="headline"
                >${this.hass.localize(
                  "ui.panel.config.users.editor.admin"
                )}</span
              >
              <span slot="supporting-text"
                >${this.hass.localize(
                  "ui.panel.config.users.editor.admin_description"
                )}</span
              >
              <ha-switch
                slot="end"
                .disabled=${user.system_generated || user.is_owner}
                .checked=${this._isAdmin}
                @change=${this._adminChanged}
              ></ha-switch>
            </ha-row-item>
            ${!this._isAdmin && !user.system_generated
              ? html`
                  <ha-alert alert-type="info">
                    ${this.hass.localize(
                      "ui.panel.config.users.users_privileges_note"
                    )}
                  </ha-alert>
                `
              : nothing}
          </div>
          ${user.system_generated
            ? html`
                <ha-alert alert-type="info">
                  ${this.hass.localize(
                    "ui.panel.config.users.editor.system_generated_read_only_users"
                  )}
                </ha-alert>
              `
            : nothing}
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            variant="danger"
            appearance="plain"
            @click=${this._deleteEntry}
            .disabled=${this._submitting ||
            user.system_generated ||
            user.is_owner}
          >
            ${this.hass!.localize("ui.panel.config.users.editor.delete_user")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._updateEntry}
            .disabled=${!this._name ||
            this._submitting ||
            user.system_generated ||
            !this.isDirtyState}
          >
            ${this.hass!.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _nameChanged(ev: InputEvent) {
    this._error = undefined;
    this._name = (ev.target as HaInput).value ?? "";
    this._publishDirtyState();
  }

  private _adminChanged(ev): void {
    this._isAdmin = ev.target.checked;
    this._publishDirtyState();
  }

  private _localOnlyChanged(ev): void {
    this._localOnly = ev.target.checked;
    this._publishDirtyState();
  }

  private _activeChanged(ev): void {
    this._isActive = ev.target.checked;
    this._publishDirtyState();
  }

  private _publishDirtyState(): void {
    this._updateDirtyState({
      name: this._name,
      isAdmin: this._isAdmin,
      localOnly: this._localOnly,
      isActive: this._isActive,
    });
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      await this.params!.updateEntry({
        name: this._name.trim(),
        is_active: this._isActive,
        group_ids: [
          this._isAdmin ? SYSTEM_GROUP_ID_ADMIN : SYSTEM_GROUP_ID_USER,
        ],
        local_only: this._localOnly,
      });
      this._markDirtyStateClean();
      this.closeDialog();
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteEntry() {
    this._submitting = true;
    try {
      if (await this.params!.removeEntry()) {
        this.closeDialog();
      }
    } finally {
      this._submitting = false;
    }
  }

  private async _changeUsername() {
    const credential = this.params?.entry.credentials.find(
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
      defaultValue: this.params!.entry.username!,
    });
    if (newUsername) {
      try {
        await adminChangeUsername(
          this.hass,
          this.params!.entry.id,
          newUsername
        );
        this.params = {
          ...this.params!,
          entry: { ...this.params!.entry, username: newUsername },
        };
        this.params.replaceEntry(this.params.entry);
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

  private async _changePassword() {
    const credential = this.params?.entry.credentials.find(
      (cred) => cred.type === "homeassistant"
    );
    if (!credential) {
      showAlertDialog(this, {
        title: "No Home Assistant credentials found.",
      });
      return;
    }

    showAdminChangePasswordDialog(this, { userId: this.params!.entry.id });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .form {
          padding-top: 16px;
        }
        .secondary {
          color: var(--secondary-text-color);
        }
        ha-row-item {
          --ha-row-item-padding-inline: 0;
        }
        .badge-container {
          margin-top: 4px;
        }
        .badge-container > * {
          margin-top: 4px;
          margin-bottom: 4px;
          margin-right: 4px;
          margin-left: 0;
          margin-inline-end: 4px;
          margin-inline-start: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-user-detail": DialogUserDetail;
  }
}
