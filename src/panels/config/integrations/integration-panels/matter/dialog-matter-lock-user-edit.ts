import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-select-box";
import type { SelectBoxOption } from "../../../../../components/ha-select-box";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-dialog";
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
    const supportsPinCredential =
      this._params.lockInfo?.supported_credential_types?.includes("pin") ??
      false;
    const title = isNew
      ? this.hass.localize("ui.panel.config.matter.lock.users.add")
      : this.hass.localize("ui.panel.config.matter.lock.users.edit");
    const minPin = this._params.lockInfo?.min_pin_length || 4;
    const maxPin = this._params.lockInfo?.max_pin_length || 8;

    return html`
      <ha-dialog
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

          ${isNew && supportsPinCredential
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
                  placeholder=${this.hass.localize(
                    "ui.panel.config.matter.lock.errors.pin_placeholder",
                    { min: minPin, max: maxPin }
                  )}
                  minlength=${minPin}
                  maxlength=${maxPin}
                  required
                ></ha-textfield>
              `
            : nothing}
          ${isNew && !supportsPinCredential
            ? html`<ha-alert alert-type="warning">
                ${this.hass.localize(
                  "ui.panel.config.matter.lock.errors.no_credential_types_supported"
                )}
              </ha-alert>`
            : nothing}

          <div class="user-type-section">
            <label
              >${this.hass.localize(
                "ui.panel.config.matter.lock.users.type"
              )}</label
            >
            <ha-select-box
              .options=${this._userTypeOptions}
              .value=${this._userType}
              .maxColumns=${1}
              @value-changed=${this._handleUserTypeChanged}
            ></ha-select-box>
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
            .disabled=${this._saving || (isNew && !supportsPinCredential)}
          >
            ${this._saving
              ? html`<ha-spinner size="small"></ha-spinner>`
              : isNew
                ? this.hass.localize("ui.panel.config.matter.lock.users.add")
                : this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
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

  private get _userTypeOptions(): SelectBoxOption[] {
    return SIMPLE_USER_TYPES.map((type) => ({
      value: type,
      label: this.hass.localize(
        `ui.panel.config.matter.lock.users.user_types.${type}.label` as any
      ),
      description: this.hass.localize(
        `ui.panel.config.matter.lock.users.user_types.${type}.description` as any
      ),
    }));
  }

  private _handleUserTypeChanged(ev: CustomEvent): void {
    this._userType = ev.detail.value as MatterLockUserType;
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
