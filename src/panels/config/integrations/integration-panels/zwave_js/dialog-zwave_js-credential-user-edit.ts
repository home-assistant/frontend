import { mdiDelete, mdiPencil, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-radio";
import type { HaRadio } from "../../../../../components/ha-radio";
import "../../../../../components/ha-select-box";
import type { SelectBoxOption } from "../../../../../components/ha-select-box";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/input/ha-input";
import {
  ENTERABLE_ZWAVE_CREDENTIAL_TYPES,
  clearZwaveCredential,
  getZwaveCredentialTypeIcon,
  getZwaveUsers,
  setZwaveCredential,
  setZwaveUser,
} from "../../../../../data/zwave_js-credentials";
import type {
  ZwaveCredential,
  ZwaveCredentialType,
  ZwaveUser,
} from "../../../../../data/zwave_js-credentials";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { showZwaveCredentialEditDialog } from "./show-dialog-zwave_js-credential-edit";
import type { ZwaveCredentialUserEditDialogParams } from "./show-dialog-zwave_js-credential-user-edit";

// UI surfaces only general + disposable to stay aligned with Matter lock UX.
// Other types (programming, duress, non_access, remote_only, expiring) are
// defined in translations for display in existing-user rows, but are not
// selectable here.
const SIMPLE_USER_TYPES: readonly string[] = ["general", "disposable"];

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

  @state() private _dataTouched = false;

  @state() private _credentials: ZwaveCredential[] = [];

  @state() private _open = false;

  private _initialUserName = "";

  private _initialUserType = "";

  public async showDialog(
    params: ZwaveCredentialUserEditDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = "";
    this._credentialData = "";
    this._dataTouched = false;
    this._open = true;

    if (params.user) {
      this._userName = params.user.user_name || "";
      this._userType = params.user.user_type;
      this._credentials = params.user.credentials;
    } else {
      this._userName = "";
      const supported = params.capabilities.supported_user_types ?? [];
      this._userType =
        SIMPLE_USER_TYPES.find((t) => supported.includes(t)) || "general";
      this._credentials = [];
    }

    this._initialUserName = this._userName;
    this._initialUserType = this._userType;
    this._credentialType = this._enterableTypes[0] || "";
  }

  private get _isDirty(): boolean {
    return (
      this._userName !== this._initialUserName ||
      this._userType !== this._initialUserType
    );
  }

  private get _enterableTypes(): ZwaveCredentialType[] {
    if (!this._params?.capabilities.supported_credential_types) {
      return [];
    }
    return ENTERABLE_ZWAVE_CREDENTIAL_TYPES.filter(
      (type) => type in this._params!.capabilities.supported_credential_types
    );
  }

  private get _selectedTypeCapability() {
    return this._params?.capabilities.supported_credential_types[
      this._credentialType
    ];
  }

  private get _supportsUserNames(): boolean {
    return (this._params?.capabilities.max_user_name_length ?? 0) > 0;
  }

  private get _userLabel(): string {
    const user = this._params?.user;
    if (!user) {
      return "";
    }
    return (
      user.user_name ||
      this.hass.localize(
        "ui.panel.config.zwave_js.credentials.users.unnamed_user",
        { index: user.user_id }
      )
    );
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
          ${!isNew && !this._supportsUserNames
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
                        <div class="radio-group">
                          ${this._enterableTypes.map(
                            (type) => html`
                              <ha-formfield
                                .label=${this.hass.localize(
                                  `ui.panel.config.zwave_js.credentials.credential_types.${type}` as any
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
                    `ui.panel.config.zwave_js.credentials.credential_data.${this._credentialType}` as any
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
                    "ui.panel.config.zwave_js.credentials.credential_data.placeholder",
                    { min: minLength, max: maxLength }
                  )}
                  minlength=${minLength}
                  maxlength=${maxLength}
                  required
                  auto-validate
                  ?invalid=${this._dataTouched && !!this._credentialError}
                  validation-message=${this._credentialError || ""}
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
          ${!isNew ? this._renderCredentialsList(hasEnterableType) : nothing}
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
          ${isNew || this._isDirty
            ? html`
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
                  ?disabled=${this._saving ||
                  (isNew && !hasEnterableType) ||
                  !this._canSave}
                  ?loading=${this._saving}
                >
                  ${isNew
                    ? this.hass.localize(
                        "ui.panel.config.zwave_js.credentials.users.add"
                      )
                    : this.hass.localize("ui.common.save")}
                </ha-button>
              `
            : html`
                <ha-button
                  slot="primaryAction"
                  appearance="plain"
                  @click=${this.closeDialog}
                  ?disabled=${this._saving}
                >
                  ${this.hass.localize("ui.common.close")}
                </ha-button>
              `}
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderCredentialsList(hasEnterableType: boolean) {
    return html`
      <div class="credentials-section">
        <label>
          ${this.hass.localize(
            "ui.panel.config.zwave_js.credentials.credentials.title"
          )}
        </label>
        ${this._credentials.length
          ? html`
              <ha-md-list>
                ${this._credentials.map(
                  (credential) => html`
                    <ha-md-list-item>
                      <ha-svg-icon
                        slot="start"
                        .path=${getZwaveCredentialTypeIcon(credential.type)}
                      ></ha-svg-icon>
                      <span slot="headline">
                        ${this.hass.localize(
                          `ui.panel.config.zwave_js.credentials.credential_types.${credential.type}` as any
                        ) || credential.type}
                      </span>
                      <span slot="supporting-text">
                        ${this.hass.localize(
                          "ui.panel.config.zwave_js.credentials.credentials.slot",
                          { slot: credential.slot }
                        )}
                      </span>
                      <ha-icon-button
                        slot="end"
                        .path=${mdiPencil}
                        .label=${this.hass.localize(
                          "ui.panel.config.zwave_js.credentials.credentials.edit"
                        )}
                        data-credential-type=${credential.type}
                        data-credential-slot=${credential.slot}
                        ?disabled=${this._saving}
                        @click=${this._handleEditCredential}
                      ></ha-icon-button>
                      <ha-icon-button
                        slot="end"
                        .path=${mdiDelete}
                        .label=${this.hass.localize(
                          "ui.panel.config.zwave_js.credentials.credentials.delete"
                        )}
                        data-credential-type=${credential.type}
                        data-credential-slot=${credential.slot}
                        ?disabled=${this._saving}
                        @click=${this._handleDeleteCredential}
                      ></ha-icon-button>
                    </ha-md-list-item>
                  `
                )}
              </ha-md-list>
            `
          : html`
              <p class="empty">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.credentials.credentials.none"
                )}
              </p>
            `}
        ${hasEnterableType
          ? html`
              <ha-button
                class="add-credential"
                size="small"
                appearance="filled"
                @click=${this._handleAddCredential}
                ?disabled=${this._saving}
              >
                <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.credentials.credentials.add"
                )}
              </ha-button>
            `
          : nothing}
      </div>
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
    this._dataTouched = true;
  }

  private get _canSave(): boolean {
    if (!this._params) {
      return false;
    }
    if (this._supportsUserNames && !this._userName.trim()) {
      return false;
    }
    const isNew = !this._params.user;
    if (isNew && this._credentialError) {
      return false;
    }
    return true;
  }

  private get _credentialError(): string {
    if (!this._params) {
      return "";
    }
    if (!this._credentialData) {
      return this.hass.localize(
        "ui.panel.config.zwave_js.credentials.errors.credential_required"
      );
    }
    const minLength = this._selectedTypeCapability?.min_length ?? 4;
    const maxLength = this._selectedTypeCapability?.max_length ?? 10;
    if (
      this._credentialData.length < minLength ||
      this._credentialData.length > maxLength
    ) {
      return this.hass.localize(
        "ui.panel.config.zwave_js.credentials.errors.credential_length",
        { min: minLength, max: maxLength }
      );
    }
    if (
      this._credentialType === "pin_code" &&
      !/^\d+$/.test(this._credentialData)
    ) {
      return this.hass.localize(
        "ui.panel.config.zwave_js.credentials.errors.pin_digits_only"
      );
    }
    return "";
  }

  private _handleCredentialTypeChanged(ev: Event): void {
    this._credentialType = (ev.target as HaRadio).value as ZwaveCredentialType;
    this._credentialData = "";
    this._dataTouched = false;
  }

  private get _userTypeOptions(): SelectBoxOption[] {
    const supported = this._params?.capabilities.supported_user_types || [];
    const types = SIMPLE_USER_TYPES.filter((t) => supported.includes(t));
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

  private _handleAddCredential(): void {
    if (!this._params?.user) {
      return;
    }
    showZwaveCredentialEditDialog(this, {
      entity_id: this._params.entity_id,
      capabilities: this._params.capabilities,
      user_id: this._params.user.user_id,
      user_label: this._userLabel,
      onSaved: () => this._onCredentialSaved(),
    });
  }

  private _credentialFromEvent(ev: Event): ZwaveCredential | undefined {
    const target = ev.currentTarget as HTMLElement;
    const type = target.dataset.credentialType;
    const slot = Number(target.dataset.credentialSlot ?? "");
    return this._credentials.find((c) => c.type === type && c.slot === slot);
  }

  private _handleEditCredential(ev: Event): void {
    if (!this._params?.user) {
      return;
    }
    const credential = this._credentialFromEvent(ev);
    if (!credential) {
      return;
    }
    showZwaveCredentialEditDialog(this, {
      entity_id: this._params.entity_id,
      capabilities: this._params.capabilities,
      user_id: this._params.user.user_id,
      user_label: this._userLabel,
      credential,
      onSaved: () => this._onCredentialSaved(),
    });
  }

  private async _onCredentialSaved(): Promise<void> {
    this._error = "";
    await this._refreshCredentials();
    this._params?.onSaved();
  }

  private async _save(): Promise<void> {
    if (!this._params) {
      return;
    }

    this._error = "";
    const isNew = !this._params.user;

    if (this._supportsUserNames && !this._userName.trim()) {
      this._error = this.hass.localize(
        "ui.panel.config.zwave_js.credentials.errors.name_required"
      );
      return;
    }

    if (isNew) {
      this._dataTouched = true;
      if (this._credentialError || !this._credentialType) {
        return;
      }
    }

    this._saving = true;

    try {
      if (isNew) {
        const { user_id } = await setZwaveUser(
          this.hass,
          this._params.entity_id,
          {
            user_name: this._supportsUserNames
              ? this._userName.trim()
              : undefined,
            user_type: this._userType,
            active: true,
          }
        );

        // User exists on the lock now. If the credential call fails, flip
        // the dialog into edit mode for the new user so the operator can
        // retry adding a credential inline instead of reopening from the
        // list.
        try {
          await setZwaveCredential(this.hass, this._params.entity_id, {
            user_id,
            credential_type: this._credentialType as ZwaveCredentialType,
            credential_data: this._credentialData,
          });
        } catch (err: unknown) {
          await this._switchToEditModeAfterCredentialFailure(user_id, err);
          return;
        }
      } else {
        await setZwaveUser(this.hass, this._params.entity_id, {
          user_id: this._params.user!.user_id,
          user_name: this._supportsUserNames
            ? this._userName.trim()
            : undefined,
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

  private async _handleDeleteCredential(ev: Event): Promise<void> {
    if (!this._params?.user) {
      return;
    }
    const credential = this._credentialFromEvent(ev);
    if (!credential) {
      return;
    }
    const typeLabel =
      this.hass.localize(
        `ui.panel.config.zwave_js.credentials.credential_types.${credential.type}` as any
      ) || credential.type;
    const confirmed = await showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.zwave_js.credentials.confirm_delete_credential",
        { type: typeLabel, slot: credential.slot }
      ),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    this._saving = true;
    try {
      await clearZwaveCredential(this.hass, this._params.entity_id, {
        user_id: this._params.user.user_id,
        credential_type: credential.type,
        credential_slot: credential.slot,
      });
      this._error = "";
      await this._refreshCredentials();
      this._params.onSaved();
    } catch (err: unknown) {
      showAlertDialog(this, {
        text:
          (err as Error).message ||
          this.hass.localize(
            "ui.panel.config.zwave_js.credentials.errors.save_failed"
          ),
      });
    } finally {
      this._saving = false;
    }
  }

  private async _refreshCredentials(): Promise<void> {
    if (!this._params?.user) {
      return;
    }
    const response = await getZwaveUsers(this.hass, this._params.entity_id);
    const updated = response.users.find(
      (u) => u.user_id === this._params!.user!.user_id
    );
    this._credentials = updated?.credentials || [];
  }

  private async _switchToEditModeAfterCredentialFailure(
    user_id: number,
    err: unknown
  ): Promise<void> {
    if (!this._params) {
      return;
    }
    // Notify parent so the new user appears in the manage list too.
    this._params.onSaved();

    let newUser: ZwaveUser | undefined;
    try {
      const response = await getZwaveUsers(this.hass, this._params.entity_id);
      newUser = response.users.find((u) => u.user_id === user_id);
    } catch {
      // Fallback: close and alert if we cannot fetch the new user row.
      this.closeDialog();
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.credentials.errors.save_failed"
        ),
        text: (err as Error).message,
      });
      return;
    }

    if (!newUser) {
      this.closeDialog();
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.credentials.errors.save_failed"
        ),
        text: (err as Error).message,
      });
      return;
    }

    this._params = { ...this._params, user: newUser };
    this._userName = newUser.user_name || "";
    this._userType = newUser.user_type;
    this._initialUserName = this._userName;
    this._initialUserType = this._userType;
    this._credentials = newUser.credentials;
    this._credentialData = "";
    this._dataTouched = false;
    this._error = this.hass.localize(
      "ui.panel.config.zwave_js.credentials.errors.credential_save_failed_user_created",
      {
        message:
          (err as Error).message ||
          this.hass.localize(
            "ui.panel.config.zwave_js.credentials.errors.save_failed"
          ),
      }
    );
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
    this._dataTouched = false;
    this._credentials = [];
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
        .credential-type-section,
        .credentials-section {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
        }
        .user-type-section > label,
        .credential-type-section > label,
        .credentials-section > label {
          font-weight: 500;
          color: var(--primary-text-color);
        }
        .radio-group {
          display: flex;
          flex-direction: column;
        }
        .credentials-section .empty {
          color: var(--secondary-text-color);
          margin: 0;
        }
        .credentials-section .add-credential {
          align-self: flex-start;
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
