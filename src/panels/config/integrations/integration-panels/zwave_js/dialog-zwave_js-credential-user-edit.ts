import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeKeys } from "../../../../../common/translations/localize";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-radio";
import type { HaRadio } from "../../../../../components/ha-radio";
import "../../../../../components/ha-select-box";
import type { SelectBoxOption } from "../../../../../components/ha-select-box";
import "../../../../../components/ha-spinner";
import "../../../../../components/input/ha-input";
import {
  DEFAULT_CREDENTIAL_MAX_LENGTH,
  DEFAULT_CREDENTIAL_MIN_LENGTH,
  ENTERABLE_ZWAVE_CREDENTIAL_TYPES,
  deleteZwaveCredential,
  deleteZwaveUser,
  enterableCredentialTypes,
  getCredentialError,
  compatibleUserTypes,
  setZwaveCredential,
  setZwaveUser,
} from "../../../../../data/zwave_js-credentials";
import type {
  ZwaveCredential,
  ZwaveCredentialType,
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

  @state() private _credentialType: ZwaveCredentialType | "" = "";

  @state() private _credentialData = "";

  @state() private _saving = false;

  @state() private _error = "";

  @state() private _credentialDataDirty = false;

  @state() private _open = false;

  private _initialUserName = "";

  private _initialUserType = "";

  public async showDialog(
    params: ZwaveCredentialUserEditDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = "";
    this._credentialDataDirty = false;
    this._open = true;

    const existingCred = this._existingCredential(params);

    if (params.user) {
      this._userName = params.user.user_name || "";
      this._userType = params.user.user_type;
    } else {
      this._userName = "";
      // Invariant: manage dialog gates entry on a non-empty list.
      this._userType = compatibleUserTypes(params.capabilities)[0] ?? "";
    }

    // Default to the existing enterable credential type (if any),
    // or the first supported enterable type.
    this._credentialType =
      existingCred &&
      ENTERABLE_ZWAVE_CREDENTIAL_TYPES.includes(existingCred.type)
        ? existingCred.type
        : (enterableCredentialTypes(params.capabilities)[0] ?? "");
    // Always show an empty field for credential data - we override it when something is entered.
    this._credentialData = "";

    this._initialUserName = this._userName;
    this._initialUserType = this._userType;
  }

  private _existingCredential(
    params: ZwaveCredentialUserEditDialogParams
  ): ZwaveCredential | undefined {
    return params.user?.credentials[0];
  }

  private get _enterableTypes(): ZwaveCredentialType[] {
    return this._params
      ? enterableCredentialTypes(this._params.capabilities)
      : [];
  }

  private get _selectedTypeCapability() {
    return this._params?.capabilities.supported_credential_types[
      this._credentialType
    ];
  }

  // max_user_name_length === 0 is the lock's way of saying "names are not
  // stored on this device". In that case we hide the name field entirely
  // and identify the user by ID instead.
  private get _supportsUserNames(): boolean {
    return (this._params?.capabilities.max_user_name_length ?? 0) > 0;
  }

  private get _userTypeOptions(): SelectBoxOption[] {
    if (!this._params) {
      return [];
    }
    return compatibleUserTypes(this._params.capabilities).map((type) => ({
      value: type,
      label:
        this.hass.localize(
          `ui.panel.config.zwave_js.credentials.users.user_types.${type}.label` as LocalizeKeys
        ) || type,
      description: this.hass.localize(
        `ui.panel.config.zwave_js.credentials.users.user_types.${type}.description` as LocalizeKeys
      ),
    }));
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const isNew = !this._params.user;
    const hasEnterableType = this._enterableTypes.length > 0;
    const multipleEnterableTypes = this._enterableTypes.length > 1;
    const userTypeOptions = this._userTypeOptions;
    const showUserTypeSelect = userTypeOptions.length > 1;
    const userTypeIsSelectable = userTypeOptions.some(
      (opt) => opt.value === this._userType
    );
    // Edit-only: the device no longer exposes any enterable credential type
    // (e.g. firmware update changed support). The new-user flow can't be
    // reached in that state — the manage dialog gates entry — so this
    // warning only matters when editing.
    const showNoCredentialTypeWarning = !isNew && !hasEnterableType;
    // Edit-only fallback: when names aren't stored on the device, show the
    // user ID as a header so the operator can identify which record they're
    // editing. The name input is omitted below in that case.
    const showUserIdInfo = !isNew && !this._supportsUserNames;
    // Edit-only: the existing user has a user_type outside SIMPLE_USER_TYPES
    // (e.g. "programming"). The select wouldn't include it, so we instead
    // surface the current type as a read-only label so the operator knows
    // what they're working with. Saving without a type change preserves it.
    const showUserTypeReadOnly =
      !isNew &&
      !showUserTypeSelect &&
      !userTypeIsSelectable &&
      !!this._userType;
    const title = isNew
      ? this.hass.localize("ui.panel.config.zwave_js.credentials.users.add")
      : this.hass.localize("ui.panel.config.zwave_js.credentials.users.edit");
    const maxNameLength = this._params.capabilities.max_user_name_length ?? 20;
    const minLength =
      this._selectedTypeCapability?.min_length ?? DEFAULT_CREDENTIAL_MIN_LENGTH;
    const maxLength =
      this._selectedTypeCapability?.max_length ?? DEFAULT_CREDENTIAL_MAX_LENGTH;
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
          ${showNoCredentialTypeWarning
            ? html`<ha-alert alert-type="warning">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.credentials.errors.no_compatible_credential_types"
                )}
              </ha-alert>`
            : nothing}
          ${showUserIdInfo
            ? html`<p class="user-id-info">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.credentials.users.unnamed_user",
                  { index: this._params.user!.user_id }
                )}
              </p>`
            : nothing}
          ${this._supportsUserNames
            ? html`
                <ha-input
                  .label=${this.hass.localize(
                    "ui.panel.config.zwave_js.credentials.users.name"
                  )}
                  .value=${this._userName}
                  @input=${this._handleNameChange}
                  maxlength=${maxNameLength}
                  autofocus
                ></ha-input>
              `
            : nothing}
          ${hasEnterableType
            ? html`
                ${multipleEnterableTypes
                  ? html`
                      <div class="credential-type-section">
                        <label>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.credentials.credential_data.type"
                          )}
                        </label>
                        <div class="radio-group">
                          ${this._enterableTypes.map(
                            (type) => html`
                              <ha-formfield
                                .label=${this.hass.localize(
                                  `ui.panel.config.zwave_js.credentials.credential_types.${type}` as LocalizeKeys
                                )}
                              >
                                <ha-radio
                                  name="credential-type"
                                  .value=${type}
                                  .checked=${this._credentialType === type}
                                  @change=${this._handleCredentialTypeChanged}
                                ></ha-radio>
                              </ha-formfield>
                            `
                          )}
                        </div>
                      </div>
                    `
                  : nothing}
                <ha-input
                  .label=${this.hass.localize(
                    `ui.panel.config.zwave_js.credentials.credential_data.${this._credentialType}` as LocalizeKeys
                  )}
                  .value=${this._credentialData}
                  @input=${this._handleCredentialDataChange}
                  @beforeinput=${this._handleCredentialBeforeInput}
                  @blur=${this._handleCredentialBlur}
                  type="password"
                  password-toggle
                  autocomplete="off"
                  inputmode=${isPin ? "numeric" : "text"}
                  pattern=${isPin ? "[0-9]+" : ".+"}
                  placeholder=${this.hass.localize(
                    isPin
                      ? "ui.panel.config.zwave_js.credentials.credential_data.placeholder_pin"
                      : "ui.panel.config.zwave_js.credentials.credential_data.placeholder",
                    { min: minLength, max: maxLength }
                  )}
                  minlength=${minLength}
                  maxlength=${maxLength}
                  ?required=${isNew}
                  auto-validate
                  ?invalid=${this._credentialDataDirty &&
                  !!this._credentialError}
                  validation-message=${this._credentialError || ""}
                ></ha-input>
              `
            : nothing}
          ${showUserTypeSelect
            ? html`
                <div class="user-type-section">
                  <label for="user-type-select">
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.credentials.users.type"
                    )}
                  </label>
                  <ha-select-box
                    id="user-type-select"
                    .options=${userTypeOptions}
                    .value=${this._userType}
                    .maxColumns=${1}
                    @value-changed=${this._handleUserTypeChanged}
                  ></ha-select-box>
                </div>
              `
            : showUserTypeReadOnly
              ? html`
                  <div class="user-type-section">
                    <label>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.credentials.users.type"
                      )}
                    </label>
                    <p class="user-type-readonly">
                      ${this.hass.localize(
                        `ui.panel.config.zwave_js.credentials.users.user_types.${this._userType}.label` as LocalizeKeys
                      ) || this._userType}
                    </p>
                  </div>
                `
              : nothing}
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
            ?disabled=${this._saving}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            ?disabled=${this._saving || !this._canSave}
            ?loading=${this._saving}
          >
            ${isNew
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
      const stripped = value.replace(/\D/g, "");
      if (stripped !== value) {
        (ev.target as HTMLInputElement).value = stripped;
        value = stripped;
      }
    }
    this._credentialData = value;
  }

  private _handleCredentialBeforeInput(ev: InputEvent): void {
    if (this._credentialType !== "pin_code") {
      return;
    }
    const data = ev.data;
    if (data && /\D/.test(data)) {
      ev.preventDefault();
    }
  }

  private _handleCredentialBlur(): void {
    this._credentialDataDirty = true;
  }

  private get _canSave(): boolean {
    if (!this._params) {
      return false;
    }
    if (!this._enterableTypes.length) {
      return false;
    }
    if (this._supportsUserNames && !this._userName.trim()) {
      return false;
    }
    if (!this._credentialType) {
      return false;
    }
    if (this._credentialError) {
      return false;
    }
    if (!this._params.user) {
      // New-user flow: entering a credential is mandatory
      return !!this._credentialData;
    }
    // Edit flow: switching credential type requires new credential data.
    if (this._credentialTypeChanged) {
      return !!this._credentialData;
    }
    // Otherwise allow saving when the user was renamed or new credential data was entered
    return !!this._credentialData || this._userChanged;
  }

  private get _userChanged(): boolean {
    return (
      this._userName !== this._initialUserName ||
      this._userType !== this._initialUserType
    );
  }

  private get _credentialTypeChanged(): boolean {
    if (!this._params?.user) {
      return false;
    }
    const existing = this._existingCredential(this._params);
    return !!existing && this._credentialType !== existing.type;
  }

  private get _credentialError(): string {
    if (!this._params) {
      return "";
    }
    // In edit mode without a credential-type switch, an empty field means
    // "keep existing" — no validation needed until the operator types.
    if (
      this._params.user &&
      !this._credentialData &&
      !this._credentialTypeChanged
    ) {
      return "";
    }
    const code = getCredentialError(
      this._credentialData,
      this._credentialType,
      this._selectedTypeCapability
    );
    switch (code) {
      case "required":
        return this.hass.localize(
          "ui.panel.config.zwave_js.credentials.errors.credential_required"
        );
      case "length": {
        const minLength =
          this._selectedTypeCapability?.min_length ??
          DEFAULT_CREDENTIAL_MIN_LENGTH;
        const maxLength =
          this._selectedTypeCapability?.max_length ??
          DEFAULT_CREDENTIAL_MAX_LENGTH;
        return this.hass.localize(
          "ui.panel.config.zwave_js.credentials.errors.credential_length",
          { min: minLength, max: maxLength }
        );
      }
      case "pin_digits_only":
        return this.hass.localize(
          "ui.panel.config.zwave_js.credentials.errors.pin_digits_only"
        );
      default:
        return "";
    }
  }

  private _handleCredentialTypeChanged(ev: Event): void {
    this._credentialType = (ev.target as HaRadio).value as ZwaveCredentialType;
    // Switching types invalidates any data tied to the previous type's
    // length/charset constraints, so always clear the field for re-entry.
    this._credentialData = "";
    // Changing the credential type requires entering new credentials.
    // To make this obvious, we mark the field as dirty, so a validation error is shown.
    this._credentialDataDirty = this._credentialTypeChanged;
  }

  private _handleUserTypeChanged(ev: CustomEvent): void {
    this._userType = ev.detail.value as string;
  }

  private async _save(): Promise<void> {
    if (!this._params) {
      return;
    }

    this._error = "";
    this._credentialDataDirty = true;

    if (this._supportsUserNames && !this._userName.trim()) {
      this._error = this.hass.localize(
        "ui.panel.config.zwave_js.credentials.errors.name_required"
      );
      return;
    }

    const credentialType = this._credentialType;
    if (!credentialType || this._credentialError) {
      return;
    }

    this._saving = true;

    try {
      if (!this._params.user) {
        await this._saveNewUser(credentialType);
      } else {
        await this._saveExistingUser(credentialType);
      }
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

  private async _saveNewUser(
    credentialType: ZwaveCredentialType
  ): Promise<void> {
    const params = this._params!;
    const { user_id } = await setZwaveUser(this.hass, params.entity_id, {
      user_name: this._supportsUserNames ? this._userName.trim() : undefined,
      user_type: this._userType,
      active: true,
    });

    try {
      await setZwaveCredential(this.hass, params.entity_id, {
        user_id,
        credential_type: credentialType,
        credential_data: this._credentialData,
      });
    } catch (err: unknown) {
      // Roll back the user so the lock returns to its prior state. We
      // ignore rollback errors — the credential error is the actionable
      // one to surface; a stranded user will reappear on next refresh.
      try {
        await deleteZwaveUser(this.hass, params.entity_id, user_id);
      } catch {
        // Ignore.
      }
      this._error = this.hass.localize(
        "ui.panel.config.zwave_js.credentials.errors.add_user_failed",
        {
          message:
            (err as Error).message ||
            this.hass.localize(
              "ui.panel.config.zwave_js.credentials.errors.save_failed"
            ),
        }
      );
      return;
    }

    params.onSaved();
    this.closeDialog();
  }

  private async _saveExistingUser(
    credentialType: ZwaveCredentialType
  ): Promise<void> {
    const params = this._params!;
    const user = params.user!;
    const existingCred = this._existingCredential(params);

    if (this._userChanged) {
      await setZwaveUser(this.hass, params.entity_id, {
        user_id: user.user_id,
        user_name: this._supportsUserNames ? this._userName.trim() : undefined,
        user_type: this._userType,
      });
    }

    // Only update/override credentials when the user entered one.
    if (this._credentialData) {
      const typeChanged =
        !!existingCred && existingCred.type !== credentialType;
      if (typeChanged) {
        await deleteZwaveCredential(this.hass, params.entity_id, {
          user_id: user.user_id,
          credential_type: existingCred!.type,
          credential_slot: existingCred!.slot,
        });
      }
      await setZwaveCredential(this.hass, params.entity_id, {
        user_id: user.user_id,
        credential_type: credentialType,
        credential_data: this._credentialData,
        credential_slot: typeChanged ? undefined : existingCred?.slot,
      });
    }

    params.onSaved();
    this.closeDialog();
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
    this._credentialDataDirty = false;
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
        .radio-group {
          display: flex;
          flex-direction: column;
        }
        .user-type-readonly {
          margin: 0;
          color: var(--primary-text-color);
        }
        .user-id-info {
          margin: 0;
          color: var(--secondary-text-color);
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
