import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import "../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-formfield";
import "../../../components/ha-switch";
import { createAuthForUser } from "../../../data/auth";
import {
  createUser,
  deleteUser,
  SYSTEM_GROUP_ID_ADMIN,
  SYSTEM_GROUP_ID_USER,
  User,
} from "../../../data/user";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { AddUserDialogParams } from "./show-dialog-add-user";

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
      if (ev.keyCode === 13) {
        this._createUser(ev);
      }
    });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
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
            ? html` <paper-input
                class="name"
                name="name"
                .label=${this.hass.localize(
                  "ui.panel.config.users.editor.name"
                )}
                .value=${this._name}
                required
                auto-validate
                autocapitalize="on"
                .errorMessage=${this.hass.localize("ui.common.error_required")}
                @value-changed=${this._handleValueChanged}
                @blur=${this._maybePopulateUsername}
                dialogInitialFocus
              ></paper-input>`
            : ""}
          <paper-input
            class="username"
            name="username"
            .label=${this.hass.localize(
              "ui.panel.config.users.editor.username"
            )}
            .value=${this._username}
            required
            auto-validate
            autocapitalize="none"
            @value-changed=${this._handleValueChanged}
            .errorMessage=${this.hass.localize("ui.common.error_required")}
            dialogInitialFocus
          ></paper-input>

          <paper-input
            .label=${this.hass.localize(
              "ui.panel.config.users.add_user.password"
            )}
            type="password"
            name="password"
            .value=${this._password}
            required
            auto-validate
            @value-changed=${this._handleValueChanged}
            .errorMessage=${this.hass.localize("ui.common.error_required")}
          ></paper-input>

          <paper-input
            label=${this.hass.localize(
              "ui.panel.config.users.add_user.password_confirm"
            )}
            name="passwordConfirm"
            .value=${this._passwordConfirm}
            @value-changed=${this._handleValueChanged}
            required
            type="password"
            .invalid=${this._password !== "" &&
            this._passwordConfirm !== "" &&
            this._passwordConfirm !== this._password}
            .errorMessage=${this.hass.localize(
              "ui.panel.config.users.add_user.password_not_match"
            )}
          ></paper-input>
          <div class="row">
            <ha-formfield
              .label=${this.hass.localize(
                "ui.panel.config.users.editor.local_only"
              )}
              .dir=${computeRTLDirection(this.hass)}
            >
              <ha-switch
                .checked=${this._localOnly}
                @change=${this._localOnlyChanged}
              >
              </ha-switch>
            </ha-formfield>
          </div>
          <div class="row">
            <ha-formfield
              .label=${this.hass.localize("ui.panel.config.users.editor.admin")}
              .dir=${computeRTLDirection(this.hass)}
            >
              <ha-switch
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
        </div>
        ${this._loading
          ? html`
              <div slot="primaryAction" class="submit-spinner">
                <ha-circular-progress active></ha-circular-progress>
              </div>
            `
          : html`
              <mwc-button
                slot="primaryAction"
                .disabled=${!this._name ||
                !this._username ||
                !this._password ||
                this._password !== this._passwordConfirm}
                @click=${this._createUser}
              >
                ${this.hass.localize("ui.panel.config.users.add_user.create")}
              </mwc-button>
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

  private _handleValueChanged(ev: PolymerChangedEvent<string>): void {
    this._error = undefined;
    const name = (ev.target as any).name;
    this[`_${name}`] = ev.detail.value;
  }

  private async _adminChanged(ev): Promise<void> {
    this._isAdmin = ev.target.checked;
  }

  private _localOnlyChanged(ev): void {
    this._localOnly = ev.target.checked;
  }

  private async _createUser(ev) {
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-add-user": DialogAddUser;
  }
}
