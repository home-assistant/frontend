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
import "../../../../../components/input/ha-input";
import "../../../../../components/ha-dialog";
import { ENTERABLE_CREDENTIAL_TYPES } from "../../../../../data/lock-common";
import {
  setZwaveCredential,
  setZwaveUser,
} from "../../../../../data/zwave_js-credentials";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { ZwaveCredentialUserEditDialogParams } from "./show-dialog-zwave_js-credential-user-edit";

@customElement("dialog-zwave_js-credential-user-edit")
class DialogZwaveCredentialUserEdit extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ZwaveCredentialUserEditDialogParams;

  @state() private _userName = "";

  @state() private _userType = "";

  @state() private _credentialType = "";

  @state() private _credentialData = "";

  @state() private _saving = false;

  @state() private _error = "";

  @state() private _open = false;

  public async showDialog(
    params: ZwaveCredentialUserEditDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = "";
    this._credentialData = "";
    this._open = true;

    if (params.user) {
      this._userName = params.user.user_name || "";
      this._userType = params.user.user_type;
    } else {
      this._userName = "";
      this._userType =
        params.capabilities.supported_user_types?.[0] || "general";
    }

    // Default to first available enterable credential type
    this._credentialType = this._enterableTypes[0] || "";
  }

  private get _enterableTypes(): string[] {
    if (!this._params?.capabilities.supported_credential_types) {
      return [];
    }
    return ENTERABLE_CREDENTIAL_TYPES.filter(
      (type) => type in this._params!.capabilities.supported_credential_types
    );
  }

  private get _selectedTypeCapability() {
    return this._params?.capabilities.supported_credential_types[
      this._credentialType
    ];
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const isNew = !this._params.user;
    const hasEnterableType = this._enterableTypes.length > 0;
    const multipleEnterableTypes = this._enterableTypes.length > 1;
    const title = isNew
      ? this.hass.localize("ui.panel.config.zwave_js.credentials.users.add")
      : this.hass.localize("ui.panel.config.zwave_js.credentials.users.edit");
    const maxNameLength = this._params.capabilities.max_user_name_length || 20;
    const minLength = this._selectedTypeCapability?.min_length ?? 4;
    const maxLength = this._selectedTypeCapability?.max_length ?? 10;
    const isPin = this._credentialType === "pin_code";

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

          <ha-input
            .label=${this.hass.localize(
              "ui.panel.config.zwave_js.credentials.users.name"
            )}
            .value=${this._userName}
            @input=${this._handleNameChange}
            maxlength=${maxNameLength}
            autofocus
          ></ha-input>

          ${isNew && hasEnterableType
            ? html`
                ${multipleEnterableTypes
                  ? html`
                      <div class="credential-type-section">
                        <label>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.credentials.credential_data.type"
                          )}
                        </label>
                        <ha-select-box
                          .options=${this._credentialTypeOptions}
                          .value=${this._credentialType}
                          .maxColumns=${2}
                          @value-changed=${this._handleCredentialTypeChanged}
                        ></ha-select-box>
                      </div>
                    `
                  : nothing}
                <ha-input
                  .label=${this.hass.localize(
                    `ui.panel.config.zwave_js.credentials.credential_data.${this._credentialType}` as any
                  )}
                  .value=${this._credentialData}
                  @input=${this._handleCredentialDataChange}
                  type="password"
                  inputmode=${isPin ? "numeric" : "text"}
                  pattern=${isPin ? "[0-9]*" : ""}
                  placeholder=${this.hass.localize(
                    "ui.panel.config.zwave_js.credentials.credential_data.placeholder",
                    { min: minLength, max: maxLength }
                  )}
                  minlength=${minLength}
                  maxlength=${maxLength}
                  required
                ></ha-input>
              `
            : nothing}
          ${isNew && !hasEnterableType
            ? html`<ha-alert alert-type="warning">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.credentials.errors.no_credential_types_supported"
                )}
              </ha-alert>`
            : nothing}

          <div class="user-type-section">
            <label>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.credentials.users.type"
              )}
            </label>
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
            .disabled=${this._saving || (isNew && !hasEnterableType)}
          >
            ${this._saving
              ? html`<ha-spinner size="small"></ha-spinner>`
              : isNew
                ? this.hass.localize(
                    "ui.panel.config.zwave_js.credentials.users.add"
                  )
                : this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _handleNameChange(ev: InputEvent): void {
    this._userName = (ev.target as HTMLInputElement).value;
  }

  private _handleCredentialDataChange(ev: InputEvent): void {
    let value = (ev.target as HTMLInputElement).value;
    if (this._credentialType === "pin_code") {
      value = value.replace(/\D/g, "");
      (ev.target as HTMLInputElement).value = value;
    }
    this._credentialData = value;
  }

  private _handleCredentialTypeChanged(ev: CustomEvent): void {
    this._credentialType = ev.detail.value as string;
    this._credentialData = "";
  }

  private get _credentialTypeOptions(): SelectBoxOption[] {
    return this._enterableTypes.map((type) => ({
      value: type,
      label: this.hass.localize(
        `ui.panel.config.zwave_js.credentials.credential_types.${type}` as any
      ),
    }));
  }

  private get _userTypeOptions(): SelectBoxOption[] {
    const types = this._params?.capabilities.supported_user_types || [];
    return types.map((type) => ({
      value: type,
      label:
        this.hass.localize(
          `ui.panel.config.zwave_js.credentials.users.user_types.${type}.label` as any
        ) || type,
      description: this.hass.localize(
        `ui.panel.config.zwave_js.credentials.users.user_types.${type}.description` as any
      ),
    }));
  }

  private _handleUserTypeChanged(ev: CustomEvent): void {
    this._userType = ev.detail.value as string;
  }

  private async _save(): Promise<void> {
    if (!this._params) {
      return;
    }

    this._error = "";
    const isNew = !this._params.user;
    const minLength = this._selectedTypeCapability?.min_length ?? 4;
    const maxLength = this._selectedTypeCapability?.max_length ?? 10;

    if (!this._userName.trim()) {
      this._error = this.hass.localize(
        "ui.panel.config.zwave_js.credentials.errors.name_required"
      );
      return;
    }

    if (isNew) {
      if (!this._credentialData) {
        this._error = this.hass.localize(
          "ui.panel.config.zwave_js.credentials.errors.credential_required"
        );
        return;
      }

      if (
        this._credentialData.length < minLength ||
        this._credentialData.length > maxLength
      ) {
        this._error = this.hass.localize(
          "ui.panel.config.zwave_js.credentials.errors.credential_length",
          { min: minLength, max: maxLength }
        );
        return;
      }

      if (
        this._credentialType === "pin_code" &&
        !/^\d+$/.test(this._credentialData)
      ) {
        this._error = this.hass.localize(
          "ui.panel.config.zwave_js.credentials.errors.pin_digits_only"
        );
        return;
      }
    }

    this._saving = true;

    try {
      if (isNew) {
        const result = await setZwaveCredential(
          this.hass,
          this._params.device_id,
          {
            credential_type: this._credentialType,
            credential_data: this._credentialData,
            user_type: this._userType,
            active: true,
          }
        );
        if (result.user_index !== null && this._userName.trim()) {
          await setZwaveUser(this.hass, this._params.device_id, {
            user_index: result.user_index,
            user_name: this._userName.trim(),
          });
        }
      } else {
        await setZwaveUser(this.hass, this._params.device_id, {
          user_index: this._params.user!.user_index,
          user_name: this._userName.trim(),
          user_type: this._userType,
        });
      }

      this._params.onSaved();
      this.closeDialog();
    } catch (err: unknown) {
      this._error =
        (err as Error).message ||
        this.hass.localize(
          "ui.panel.config.zwave_js.credentials.errors.save_failed"
        );
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
    this._userType = "";
    this._credentialType = "";
    this._credentialData = "";
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

        .user-type-section,
        .credential-type-section {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
        }

        .user-type-section > label,
        .credential-type-section > label {
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
    "dialog-zwave_js-credential-user-edit": DialogZwaveCredentialUserEdit;
  }
}
