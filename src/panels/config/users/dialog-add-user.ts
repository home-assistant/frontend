import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-spinner";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-icon-button";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import { createAuthForUser } from "../../../data/auth";
import type { User } from "../../../data/user";
import {
  SYSTEM_GROUP_ID_ADMIN,
  SYSTEM_GROUP_ID_USER,
  createUser,
  deleteUser,
} from "../../../data/user";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import type { AddUserDialogParams } from "./show-dialog-add-user";
import "../../../components/ha-password-field";

@customElement("dialog-add-user")
export class DialogAddUser extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _loading = false;

  // Error message when can't talk to server etc
  @state() private _error?: string;

  @state() private _params?: AddUserDialogParams;

  @state() private _name?: string;

  @state() private _username?: string;

  @state() private _password?: string;

  @state() private _passwordConfirm?: string;

  @state() private _isAdmin?: boolean;

  @state() private _localOnly?: boolean;

  @state() private _allowChangeName = true;

  public showDialog(params: AddUserDialogParams) {
    this._params = params;
    this._name = this._params.name || "";
    this._username = "";
    this._password = "";
    this._passwordConfirm = "";
    this._isAdmin = false;
    this._localOnly = false;
    this._error = undefined;
    this._loading = false;

    if (this._params.name) {
      this._allowChangeName = false;
      this._maybePopulateUsername();
    } else {
      this._allowChangeName = true;
    }
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this.addEventListener("keypress", (ev) => {
      if (ev.key === "Enter") {
        this._createUser(ev);
      }
    });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.users.add_user.caption")
        )}
      >
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          ${this._allowChangeName
            ? html`<ha-textfield
                class="name"
                name="name"
                .label=${this.hass.localize(
                  "ui.panel.config.users.editor.name"
                )}
                .value=${this._name}
                required
                .validationMessage=${this.hass.localize(
                  "ui.common.error_required"
                )}
                @input=${this._handleValueChanged}
                @blur=${this._maybePopulateUsername}
                dialogInitialFocus
              ></ha-textfield>`
            : ""}
          <ha-textfield
            class="username"
            name="username"
            .label=${this.hass.localize(
              "ui.panel.config.users.editor.username"
            )}
            .value=${this._username}
            required
            @input=${this._handleValueChanged}
            .validationMessage=${this.hass.localize("ui.common.error_required")}
            dialogInitialFocus
          ></ha-textfield>

          <ha-password-field
            .label=${this.hass.localize(
              "ui.panel.config.users.add_user.password"
            )}
            name="password"
            .value=${this._password}
            required
            @input=${this._handleValueChanged}
            .validationMessage=${this.hass.localize("ui.common.error_required")}
          ></ha-password-field>

          <ha-password-field
            .label=${this.hass.localize(
              "ui.panel.config.users.add_user.password_confirm"
            )}
            name="passwordConfirm"
            .value=${this._passwordConfirm}
            @input=${this._handleValueChanged}
            required
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
                "ui.panel.config.users.editor.local_access_only"
              )}
            </span>
            <span slot="description">
              ${this.hass.localize(
                "ui.panel.config.users.editor.local_access_only_description"
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
              ${this.hass.localize("ui.panel.config.users.editor.admin")}
            </span>
            <span slot="description">
              ${this.hass.localize(
                "ui.panel.config.users.editor.admin_description"
              )}
            </span>
            <ha-switch .checked=${this._isAdmin} @change=${this._adminChanged}>
            </ha-switch>
          </ha-settings-row>
          ${!this._isAdmin
            ? html`
                <ha-alert alert-type="info">
                  ${this.hass.localize(
                    "ui.panel.config.users.users_privileges_note"
                  )}
                </ha-alert>
              `
            : nothing}
        </div>
        ${this._loading
          ? html`
              <div slot="primaryAction" class="submit-spinner">
                <ha-spinner></ha-spinner>
              </div>
            `
          : html`
              <ha-button
                slot="primaryAction"
                .disabled=${!this._name ||
                !this._username ||
                !this._password ||
                this._password !== this._passwordConfirm}
                @click=${this._createUser}
              >
                ${this.hass.localize("ui.panel.config.users.add_user.create")}
              </ha-button>
            `}
      </ha-dialog>
    `;
  }

  private _close() {
    this._params = undefined;
  }

  private _maybePopulateUsername() {
    if (this._username || !this._name) {
      return;
    }

    const parts = this._name.split(" ");

    if (parts.length) {
      this._username = parts[0].toLowerCase();
    }
  }

  private _handleValueChanged(ev: ValueChangedEvent<string>): void {
    this._error = undefined;
    const target = ev.target as HaTextField;
    this[`_${target.name}`] = target.value;
  }

  private async _adminChanged(ev: Event): Promise<void> {
    const target = ev.target as HaSwitch;
    this._isAdmin = target.checked;
  }

  private _localOnlyChanged(ev: Event): void {
    const target = ev.target as HaSwitch;
    this._localOnly = target.checked;
  }

  private async _createUser(ev: Event) {
    ev.preventDefault();
    if (!this._name || !this._username || !this._password) {
      return;
    }

    this._loading = true;
    this._error = "";

    let user: User;
    try {
      const userResponse = await createUser(
        this.hass,
        this._name,
        [this._isAdmin ? SYSTEM_GROUP_ID_ADMIN : SYSTEM_GROUP_ID_USER],
        this._localOnly
      );
      user = userResponse.user;
    } catch (err: any) {
      this._loading = false;
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
      this._loading = false;
      this._error = err.message;
      return;
    }

    user.username = this._username;
    user.credentials = [
      {
        type: "homeassistant",
      },
    ];
    this._params!.userAddedCallback(user);
    this._close();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 500px;
          --dialog-z-index: 10;
        }
        .row {
          display: flex;
          padding: 8px 0;
        }
        ha-textfield,
        ha-password-field {
          display: block;
          margin-bottom: 8px;
        }
        ha-settings-row {
          padding: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-add-user": DialogAddUser;
  }
}
