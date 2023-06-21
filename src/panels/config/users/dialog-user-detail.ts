import "@material/mwc-button";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";

import { computeRTLDirection } from "../../../common/util/compute_rtl";
import "../../../components/ha-chip";
import "../../../components/ha-chip-set";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-formfield";
import "../../../components/ha-help-tooltip";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import "../../../components/ha-textfield";
import {
  computeUserBadges,
  SYSTEM_GROUP_ID_ADMIN,
  SYSTEM_GROUP_ID_USER,
} from "../../../data/user";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { showAdminChangePasswordDialog } from "./show-dialog-admin-change-password";
import { UserDetailDialogParams } from "./show-dialog-user-detail";

@customElement("dialog-user-detail")
class DialogUserDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _isAdmin?: boolean;

  @state() private _localOnly?: boolean;

  @state() private _isActive?: boolean;

  @state() private _error?: string;

  @state() private _params?: UserDetailDialogParams;

  @state() private _submitting = false;

  public async showDialog(params: UserDetailDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = params.entry.name || "";
    this._isAdmin = params.entry.group_ids.includes(SYSTEM_GROUP_ID_ADMIN);
    this._localOnly = params.entry.local_only;
    this._isActive = params.entry.is_active;
    await this.updateComplete;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const user = this._params.entry;
    const badges = computeUserBadges(this.hass, user, true);
    return html`
      <ha-dialog
        open
        @closed=${this._close}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(this.hass, user.name)}
      >
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          <div class="secondary">
            ${this.hass.localize("ui.panel.config.users.editor.id")}:
            ${user.id}<br />
            ${this.hass.localize("ui.panel.config.users.editor.username")}:
            ${user.username}
          </div>
          ${badges.length === 0
            ? ""
            : html`
                <ha-chip-set>
                  ${badges.map(
                    ([icon, label]) => html`
                      <ha-chip hasIcon>
                        <ha-svg-icon slot="icon" .path=${icon}></ha-svg-icon>
                        ${label}
                      </ha-chip>
                    `
                  )}
                </ha-chip-set>
              `}
          <div class="form">
            <ha-textfield
              dialogInitialFocus
              .value=${this._name}
              .disabled=${user.system_generated}
              @input=${this._nameChanged}
              .label=${this.hass!.localize("ui.panel.config.users.editor.name")}
            ></ha-textfield>
            <div class="row">
              <ha-formfield
                .label=${this.hass.localize(
                  "ui.panel.config.users.editor.local_only"
                )}
                .dir=${computeRTLDirection(this.hass)}
              >
                <ha-switch
                  .disabled=${user.system_generated}
                  .checked=${this._localOnly}
                  @change=${this._localOnlyChanged}
                >
                </ha-switch>
              </ha-formfield>
            </div>
            <div class="row">
              <ha-formfield
                .label=${this.hass.localize(
                  "ui.panel.config.users.editor.admin"
                )}
                .dir=${computeRTLDirection(this.hass)}
              >
                <ha-switch
                  .disabled=${user.system_generated || user.is_owner}
                  .checked=${this._isAdmin}
                  @change=${this._adminChanged}
                >
                </ha-switch>
              </ha-formfield>
            </div>
            ${!this._isAdmin
              ? html`
                  <br />
                  ${this.hass.localize(
                    "ui.panel.config.users.users_privileges_note"
                  )}
                `
              : ""}
            <div class="row">
              <ha-formfield
                .label=${this.hass.localize(
                  "ui.panel.config.users.editor.active"
                )}
                .dir=${computeRTLDirection(this.hass)}
              >
                <ha-switch
                  .disabled=${user.system_generated || user.is_owner}
                  .checked=${this._isActive}
                  @change=${this._activeChanged}
                >
                </ha-switch>
              </ha-formfield>
              <ha-help-tooltip
                .label=${this.hass.localize(
                  "ui.panel.config.users.editor.active_tooltip"
                )}
              >
              </ha-help-tooltip>
            </div>
          </div>
        </div>

        <div slot="secondaryAction">
          <mwc-button
            class="warning"
            @click=${this._deleteEntry}
            .disabled=${this._submitting ||
            user.system_generated ||
            user.is_owner}
          >
            ${this.hass!.localize("ui.panel.config.users.editor.delete_user")}
          </mwc-button>
          ${user.system_generated
            ? html`
                <simple-tooltip animation-delay="0" position="right">
                  ${this.hass.localize(
                    "ui.panel.config.users.editor.system_generated_users_not_removable"
                  )}
                </simple-tooltip>
              `
            : ""}
          ${!user.system_generated && this.hass.user?.is_owner
            ? html`<mwc-button @click=${this._changePassword}>
                ${this.hass.localize(
                  "ui.panel.config.users.editor.change_password"
                )}
              </mwc-button>`
            : ""}
        </div>

        <div slot="primaryAction">
          <mwc-button
            @click=${this._updateEntry}
            .disabled=${!this._name ||
            this._submitting ||
            user.system_generated}
          >
            ${this.hass!.localize("ui.panel.config.users.editor.update_user")}
          </mwc-button>
          ${user.system_generated
            ? html`
                <simple-tooltip animation-delay="0" position="left">
                  ${this.hass.localize(
                    "ui.panel.config.users.editor.system_generated_users_not_editable"
                  )}
                </simple-tooltip>
              `
            : ""}
        </div>
      </ha-dialog>
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
        this._params = undefined;
      }
    } finally {
      this._submitting = false;
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
    this._params = undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 500px;
        }
        .form {
          padding-top: 16px;
        }
        .secondary {
          color: var(--secondary-text-color);
        }
        ha-chip-set,
        ha-textfield {
          display: block;
        }
        .state {
          background-color: rgba(var(--rgb-primary-text-color), 0.15);
          border-radius: 16px;
          padding: 4px 8px;
          margin-top: 8px;
          display: inline-block;
        }
        .state:not(:first-child) {
          margin-left: 8px;
        }
        .row {
          display: flex;
          padding: 8px 0;
        }
        ha-help-tooltip {
          margin-left: 4px;
          position: relative;
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
