import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-select-box";
import type { SelectBoxOption } from "../../../../../components/ha-select-box";
import "../../../../../components/ha-spinner";
import "../../../../../components/input/ha-input";
import { ENTERABLE_CREDENTIAL_TYPES } from "../../../../../data/lock-common";
import {
  clearZwaveCredential,
  setZwaveCredential,
} from "../../../../../data/zwave_js-credentials";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { ZwaveCredentialEditDialogParams } from "./show-dialog-zwave_js-credential-edit";

@customElement("dialog-zwave_js-credential-edit")
class DialogZwaveCredentialEdit extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ZwaveCredentialEditDialogParams;

  @state() private _credentialType = "";

  @state() private _credentialData = "";

  @state() private _saving = false;

  @state() private _error = "";

  @state() private _dataTouched = false;

  @state() private _open = false;

  private _initialType = "";

  private _initialData = "";

  public async showDialog(
    params: ZwaveCredentialEditDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = "";
    this._dataTouched = false;
    this._open = true;

    if (params.credential) {
      this._credentialType = params.credential.type;
      this._credentialData =
        (ENTERABLE_CREDENTIAL_TYPES as readonly string[]).includes(
          params.credential.type
        ) && params.credential.data
          ? params.credential.data
          : "";
    } else {
      this._credentialType = this._enterableTypes[0] || "";
      this._credentialData = "";
    }
    this._initialType = this._credentialType;
    this._initialData = this._credentialData;
  }

  private get _isDirty(): boolean {
    return (
      this._credentialType !== this._initialType ||
      this._credentialData !== this._initialData
    );
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
    const isEdit = !!this._params.credential;
    const multipleEnterableTypes = this._enterableTypes.length > 1;
    const typeChanged =
      isEdit && this._credentialType !== this._params.credential!.type;
    const minLength = this._selectedTypeCapability?.min_length ?? 4;
    const maxLength = this._selectedTypeCapability?.max_length ?? 10;
    const isPin = this._credentialType === "pin_code";
    const title = isEdit
      ? this.hass.localize(
          "ui.panel.config.zwave_js.credentials.credential_data.edit_title",
          { user: this._params.user_label }
        )
      : this.hass.localize(
          "ui.panel.config.zwave_js.credentials.credential_data.add_title",
          { user: this._params.user_label }
        );

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
          ${isEdit && !typeChanged
            ? html`<p class="slot-info">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.credentials.credentials.slot",
                  { slot: this._params.credential!.slot }
                )}
              </p>`
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
            autofocus
            ?invalid=${this._dataTouched && !!this._credentialError}
            validation-message=${this._credentialError || ""}
          ></ha-input>
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
            .disabled=${this._saving ||
            !!this._credentialError ||
            !this._isDirty}
          >
            ${this._saving
              ? html`<ha-spinner size="small"></ha-spinner>`
              : isEdit
                ? this.hass.localize("ui.common.save")
                : this.hass.localize(
                    "ui.panel.config.zwave_js.credentials.credential_data.add"
                  )}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private get _credentialTypeOptions(): SelectBoxOption[] {
    return this._enterableTypes.map((type) => ({
      value: type,
      label: this.hass.localize(
        `ui.panel.config.zwave_js.credentials.credential_types.${type}` as any
      ),
    }));
  }

  private _handleCredentialTypeChanged(ev: CustomEvent): void {
    this._credentialType = ev.detail.value as string;
    this._credentialData = "";
    this._dataTouched = false;
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

  private async _save(): Promise<void> {
    if (!this._params) {
      return;
    }
    this._dataTouched = true;
    if (this._credentialError) {
      return;
    }
    this._saving = true;
    this._error = "";
    try {
      const existing = this._params.credential;
      const typeChanged =
        !!existing && existing.type !== this._credentialType;
      if (typeChanged) {
        await clearZwaveCredential(this.hass, this._params.entity_id, {
          user_index: this._params.user_index,
          credential_type: existing!.type,
          credential_slot: existing!.slot,
        });
      }
      await setZwaveCredential(this.hass, this._params.entity_id, {
        user_index: this._params.user_index,
        credential_type: this._credentialType,
        credential_data: this._credentialData,
        credential_slot: typeChanged ? undefined : existing?.slot,
      });
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
    this._credentialType = "";
    this._credentialData = "";
    this._saving = false;
    this._error = "";
    this._dataTouched = false;
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
        .credential-type-section {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
        }
        .credential-type-section > label {
          font-weight: 500;
          color: var(--primary-text-color);
        }
        .slot-info {
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
    "dialog-zwave_js-credential-edit": DialogZwaveCredentialEdit;
  }
}
