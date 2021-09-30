import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-tooltip/paper-tooltip";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-formfield";
import "../../../components/ha-help-tooltip";
import "../../../components/ha-switch";
import { adminChangePassword } from "../../../data/auth";
import {
  SYSTEM_GROUP_ID_ADMIN,
  SYSTEM_GROUP_ID_USER,
} from "../../../data/user";
import {
  showAlertDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { UserDetailDialogParams } from "./show-dialog-user-detail";

@customElement("dialog-user-detail")
class DialogUserDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name!: string;

  @state() private _isAdmin?: boolean;

  @state() private _isActive?: boolean;

  @state() private _error?: string;

  @state() private _params?: UserDetailDialogParams;

  @state() private _submitting = false;

  public async showDialog(params: UserDetailDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = params.entry.name || "";
    this._isAdmin = params.entry.group_ids.includes(SYSTEM_GROUP_ID_ADMIN);
    this._isActive = params.entry.is_active;
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const user = this._params.entry;
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
          <div>
            ${user.is_owner
              ? html`
                  <span class="state"
                    >${this.hass.localize(
                      "ui.panel.config.users.editor.owner"
                    )}</span
                  >
                `
              : ""}
            ${user.system_generated
              ? html`
                  <span class="state">
                    ${this.hass.localize(
                      "ui.panel.config.users.editor.system_generated"
                    )}
                  </span>
                `
              : ""}
          </div>
          <div class="form">
            <paper-input
              .value=${this._name}
              .disabled=${user.system_generated}
              @value-changed=${this._nameChanged}
              label=${this.hass!.localize("ui.panel.config.users.editor.name")}
            ></paper-input>
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
                <paper-tooltip animation-delay="0" position="right">
                  ${this.hass.localize(
                    "ui.panel.config.users.editor.system_generated_users_not_removable"
                  )}
                </paper-tooltip>
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
                <paper-tooltip animation-delay="0" position="left">
                  ${this.hass.localize(
                    "ui.panel.config.users.editor.system_generated_users_not_editable"
                  )}
                </paper-tooltip>
              `
            : ""}
        </div>
      </ha-dialog>
    `;
  }

  private _nameChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._name = ev.detail.value;
  }

  private async _adminChanged(ev): Promise<void> {
    this._isAdmin = ev.target.checked;
  }

  private async _activeChanged(ev): Promise<void> {
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
    const newPassword = await showPromptDialog(this, {
      title: this.hass.localize("ui.panel.config.users.editor.change_password"),
      inputType: "password",
      inputLabel: this.hass.localize(
        "ui.panel.config.users.editor.new_password"
      ),
    });
    if (!newPassword) {
      return;
    }
    const confirmPassword = await showPromptDialog(this, {
      title: this.hass.localize("ui.panel.config.users.editor.change_password"),
      inputType: "password",
      inputLabel: this.hass.localize(
        "ui.panel.config.users.add_user.password_confirm"
      ),
    });
    if (!confirmPassword) {
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.users.add_user.password_not_match"
        ),
      });
      return;
    }
    await adminChangePassword(this.hass, this._params!.entry.id, newPassword);
    showAlertDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.users.editor.password_changed"
      ),
    });
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
