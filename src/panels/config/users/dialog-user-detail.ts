import { mdiPencil } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-icon-button";
import "../../../components/ha-label";
import "../../../components/ha-md-list-item";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import "../../../components/ha-textfield";
import "../../../components/ha-wa-dialog";
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
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showAdminChangePasswordDialog } from "./show-dialog-admin-change-password";
import type { UserDetailDialogParams } from "./show-dialog-user-detail";

@customElement("dialog-user-detail")
class DialogUserDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _isAdmin?: boolean;

  @state() private _localOnly?: boolean;

  @state() private _isActive?: boolean;

  @state() private _error?: string;

  @state() private _params?: UserDetailDialogParams;

  @state() private _open = false;

  @state() private _submitting = false;

  public async showDialog(params: UserDetailDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = params.entry.name || "";
    this._isAdmin = params.entry.group_ids.includes(SYSTEM_GROUP_ID_ADMIN);
    this._localOnly = params.entry.local_only;
    this._isActive = params.entry.is_active;
    this._open = true;
    await this.updateComplete;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const user = this._params.entry;
    const badges = computeUserBadges(this.hass, user, true);
    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        prevent-scrim-close
        header-title=${user.name}
        width="medium"
        @closed=${this._dialogClosed}
      >
        <div>
          ${
            this._error
              ? html`<div class="error">${this._error}</div>`
              : nothing
          }
          <div class="secondary">
            ${this.hass.localize("ui.panel.config.users.editor.id")}:
            ${user.id}<br />
          </div>
          ${
            badges.length === 0
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
                `
          }
          <div class="form">
            ${
              !user.system_generated
                ? html`
                    <ha-textfield
                      autofocus
                      .value=${this._name}
                      @input=${this._nameChanged}
                      .label=${this.hass!.localize(
                        "ui.panel.config.users.editor.name"
                      )}
                    ></ha-textfield>
                    <ha-md-list-item>
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
                    </ha-md-list-item>
                  `
                : nothing
            }
            ${
              !user.system_generated && this.hass.user?.is_owner
                ? html`
                    <ha-md-list-item>
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
                    </ha-md-list-item>
                  `
                : nothing
            }
              <ha-md-list-item>
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
              </ha-md-list-item>
              <ha-md-list-item>
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
              </ha-md-list-item>
              <ha-md-list-item>
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
                </ha-switch>
              </ha-md-list-item>
            ${
              !this._isAdmin && !user.system_generated
                ? html`
                    <ha-alert alert-type="info">
                      ${this.hass.localize(
                        "ui.panel.config.users.users_privileges_note"
                      )}
                    </ha-alert>
                  `
                : nothing
            }
          </div>
          ${
            user.system_generated
              ? html`
                  <ha-alert alert-type="info">
                    ${this.hass.localize(
                      "ui.panel.config.users.editor.system_generated_read_only_users"
                    )}
                  </ha-alert>
                `
              : nothing
          }
        </div>

        <ha-dialog-footer slot="footer">
        <ha-button
          slot="secondaryAction"
          variant="danger"
          appearance="plain"
          @click=${this._deleteEntry}
            .disabled=${
              this._submitting || user.system_generated || user.is_owner
            }
        >
          ${this.hass!.localize("ui.panel.config.users.editor.delete_user")}
        </ha-button>
        <ha-button
            slot="secondaryAction"
          appearance="plain"
          @click=${this._close}
        >
          ${this.hass!.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          slot="primaryAction"
          @click=${this._updateEntry}
            .disabled=${
              !this._name || this._submitting || user.system_generated
            }
        >
          ${this.hass!.localize("ui.common.save")}
        </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
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

  private _activeChanged(ev): void {
    this._isActive = ev.target.checked;
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      await this._params!.updateEntry({
        name: this._name.trim(),
        is_active: this._isActive,
        group_ids: [
          this._isAdmin ? SYSTEM_GROUP_ID_ADMIN : SYSTEM_GROUP_ID_USER,
        ],
        local_only: this._localOnly,
      });
      this._close();
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteEntry() {
    this._submitting = true;
    try {
      if (await this._params!.removeEntry()) {
        this._close();
      }
    } finally {
      this._submitting = false;
    }
  }

  private async _changeUsername() {
    const credential = this._params?.entry.credentials.find(
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
      defaultValue: this._params!.entry.username!,
    });
    if (newUsername) {
      try {
        await adminChangeUsername(
          this.hass,
          this._params!.entry.id,
          newUsername
        );
        this._params = {
          ...this._params!,
          entry: { ...this._params!.entry, username: newUsername },
        };
        this._params.replaceEntry(this._params.entry);
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
    const credential = this._params?.entry.credentials.find(
      (cred) => cred.type === "homeassistant"
    );
    if (!credential) {
      showAlertDialog(this, {
        title: "No Home Assistant credentials found.",
      });
      return;
    }

    showAdminChangePasswordDialog(this, { userId: this._params!.entry.id });
  }

  private _close(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
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
        ha-textfield {
          display: block;
        }
        ha-md-list-item {
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
          --md-item-overflow: visible;
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
