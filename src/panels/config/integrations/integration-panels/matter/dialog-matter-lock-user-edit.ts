import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-wa-dialog";
import type { MatterLockUserType } from "../../../../../data/matter-lock";
import {
  setMatterLockCredential,
  setMatterLockUser,
} from "../../../../../data/matter-lock";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { MatterLockUserEditDialogParams } from "./show-dialog-matter-lock-user-edit";

const SIMPLE_USER_TYPES: MatterLockUserType[] = [
  "unrestricted_user",
  "disposable_user",
];

@customElement("dialog-matter-lock-user-edit")
class DialogMatterLockUserEdit extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: MatterLockUserEditDialogParams;

  @state() private _userName = "";

  @state() private _userType: MatterLockUserType = "unrestricted_user";

  @state() private _pinCode = "";

  @state() private _saving = false;

  @state() private _error = "";

  @state() private _open = false;

  public async showDialog(
    params: MatterLockUserEditDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = "";
    this._pinCode = "";
    this._open = true;

    if (params.user) {
      this._userName = params.user.user_name || "";
      this._userType = params.user.user_type;
    } else {
      this._userName = "";
      this._userType = "unrestricted_user";
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const isNew = !this._params.user;
    const title = isNew
      ? this.hass.localize("ui.panel.config.matter.lock.users.add")
      : this.hass.localize("ui.panel.config.matter.lock.users.edit");
    const minPin = this._params.lockInfo?.min_pin_length || 4;
    const maxPin = this._params.lockInfo?.max_pin_length || 8;

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${title}
        @closed=${this._dialogClosed}
      >
        <div class="form">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}

          <ha-textfield
            .label=${this.hass.localize(
              "ui.panel.config.matter.lock.users.name"
            )}
            .value=${this._userName}
            @input=${this._handleNameChange}
            maxlength="10"
          ></ha-textfield>

          ${isNew
            ? html`
                <ha-textfield
                  .label=${this.hass.localize(
                    "ui.panel.config.matter.lock.credentials.data"
                  )}
                  .value=${this._pinCode}
                  @input=${this._handlePinChange}
                  type="password"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  placeholder="${minPin}-${maxPin} digits"
                  minlength=${minPin}
                  maxlength=${maxPin}
                  required
                ></ha-textfield>
              `
            : nothing}

          <div class="user-type-section">
            <label
              >${this.hass.localize(
                "ui.panel.config.matter.lock.users.type"
              )}</label
            >
            ${SIMPLE_USER_TYPES.map(
              (type) => html`
                <div
                  class="user-type-option ${this._userType === type
                    ? "selected"
                    : ""}"
                  .userType=${type}
                  @click=${this._handleUserTypeClick}
                >
                  <div class="user-type-label">
                    ${this.hass.localize(
                      `ui.panel.config.matter.lock.users.user_types.${type}.label`
                    )}
                  </div>
                  <div class="user-type-description">
                    ${this.hass.localize(
                      `ui.panel.config.matter.lock.users.user_types.${type}.description`
                    )}
                  </div>
                </div>
              `
            )}
          </div>
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
            .disabled=${this._saving}
          >
            ${this._saving
              ? html`<ha-spinner size="small"></ha-spinner>`
              : isNew
                ? this.hass.localize("ui.panel.config.matter.lock.users.add")
                : this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _handleNameChange(ev: InputEvent): void {
    this._userName = (ev.target as HTMLInputElement).value;
  }

  private _handlePinChange(ev: InputEvent): void {
    const value = (ev.target as HTMLInputElement).value.replace(/\D/g, "");
    this._pinCode = value;
    (ev.target as HTMLInputElement).value = value;
  }

  private _handleUserTypeClick(ev: Event): void {
    this._userType = (
      ev.currentTarget as HTMLElement & {
        userType: MatterLockUserType;
      }
    ).userType;
  }

  private async _save(): Promise<void> {
    if (!this._params) {
      return;
    }

    this._error = "";
    const isNew = !this._params.user;
    const minPin = this._params.lockInfo?.min_pin_length || 4;
    const maxPin = this._params.lockInfo?.max_pin_length || 8;

    if (!this._userName.trim()) {
      this._error = this.hass.localize(
        "ui.panel.config.matter.lock.errors.name_required"
      );
      return;
    }

    if (isNew) {
      if (!this._pinCode) {
        this._error = this.hass.localize(
          "ui.panel.config.matter.lock.errors.pin_required"
        );
        return;
      }

      if (this._pinCode.length < minPin || this._pinCode.length > maxPin) {
        this._error = this.hass.localize(
          "ui.panel.config.matter.lock.errors.pin_length",
          { min: minPin, max: maxPin }
        );
        return;
      }

      if (!/^\d+$/.test(this._pinCode)) {
        this._error = this.hass.localize(
          "ui.panel.config.matter.lock.errors.pin_digits_only"
        );
        return;
      }
    }

    this._saving = true;

    try {
      if (isNew) {
        // Create credential (auto-creates a user), then set the user name
        const result = await setMatterLockCredential(
          this.hass,
          this._params.entity_id,
          {
            credential_type: "pin",
            credential_data: this._pinCode,
            user_type: this._userType,
          }
        );
        if (result.user_index !== null && this._userName.trim()) {
          await setMatterLockUser(this.hass, this._params.entity_id, {
            user_index: result.user_index,
            user_name: this._userName.trim(),
          });
        }
      } else {
        await setMatterLockUser(this.hass, this._params.entity_id, {
          user_index: this._params.user!.user_index as number,
          user_name: this._userName.trim(),
          user_type: this._userType,
        });
      }

      this._params.onSaved();
      this.closeDialog();
    } catch (err: unknown) {
      this._error =
        (err as Error).message ||
        this.hass.localize("ui.panel.config.matter.lock.errors.save_failed");
    } finally {
      this._saving = false;
    }
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._userName = "";
    this._userType = "unrestricted_user";
    this._pinCode = "";
    this._saving = false;
    this._error = "";
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .form {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
        }

        .user-type-section {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
        }

        .user-type-section > label {
          font-weight: 500;
          color: var(--primary-text-color);
        }

        .user-type-option {
          padding: var(--ha-space-3) var(--ha-space-4);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .user-type-option:hover {
          background: var(--secondary-background-color);
        }

        .user-type-option.selected {
          border-color: var(--primary-color);
          background: rgba(var(--rgb-primary-color), 0.1);
        }

        .user-type-label {
          font-weight: 500;
          color: var(--primary-text-color);
        }

        .user-type-description {
          font-size: var(--ha-font-size-s, 12px);
          color: var(--secondary-text-color);
          margin-top: 2px;
        }

        ha-alert {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-lock-user-edit": DialogMatterLockUserEdit;
  }
}
