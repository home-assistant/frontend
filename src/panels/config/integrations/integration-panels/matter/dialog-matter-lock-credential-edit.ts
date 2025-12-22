import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-button";
import "../../../../../components/ha-select";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-list-item";
import type { MatterLockCredentialType } from "../../../../../data/matter-lock";
import { setMatterLockCredential } from "../../../../../data/matter-lock";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { MatterLockCredentialEditDialogParams } from "./show-dialog-matter-lock-credential-edit";

@customElement("dialog-matter-lock-credential-edit")
class DialogMatterLockCredentialEdit extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: MatterLockCredentialEditDialogParams;

  @state() private _credentialType: MatterLockCredentialType = "pin";

  @state() private _credentialData = "";

  @state() private _saving = false;

  public async showDialog(
    params: MatterLockCredentialEditDialogParams
  ): Promise<void> {
    this._params = params;

    if (params.credential) {
      this._credentialType = params.credential.credential_type;
    } else {
      // Default to first supported type
      const supportedTypes = params.lockInfo.supported_credential_types;
      this._credentialType =
        (supportedTypes[0] as MatterLockCredentialType) || "pin";
    }
    this._credentialData = "";
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const isNew = !this._params.credential;
    const title = isNew
      ? this.hass.localize("ui.panel.config.matter.lock.credentials.add")
      : this.hass.localize("ui.panel.config.matter.lock.credentials.edit");

    const supportedTypes = this._params.lockInfo.supported_credential_types;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, title)}
      >
        <div class="form">
          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.matter.lock.credentials.type"
            )}
            .value=${this._credentialType}
            @selected=${this._handleTypeChange}
            .disabled=${!isNew}
          >
            ${supportedTypes.map(
              (type) => html`
                <ha-list-item .value=${type}>
                  ${this.hass.localize(
                    `ui.panel.config.matter.lock.credentials.types.${type}`
                  )}
                </ha-list-item>
              `
            )}
          </ha-select>

          ${this._credentialType === "pin"
            ? html`
                <ha-textfield
                  .label=${this.hass.localize(
                    "ui.panel.config.matter.lock.credentials.data"
                  )}
                  .value=${this._credentialData}
                  @input=${this._handleDataChange}
                  type="password"
                  minlength="4"
                  maxlength="8"
                  pattern="[0-9]*"
                  inputmode="numeric"
                  helperPersistent
                  helper="4-8 digits"
                ></ha-textfield>
              `
            : nothing}
        </div>

        <ha-button
          slot="primaryAction"
          @click=${this._save}
          .disabled=${this._saving || !this._isValid()}
        >
          ${this.hass.localize("ui.common.save")}
        </ha-button>
        <ha-button slot="secondaryAction" @click=${this.closeDialog}>
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _isValid(): boolean {
    if (this._credentialType === "pin") {
      return (
        this._credentialData.length >= 4 &&
        this._credentialData.length <= 8 &&
        /^[0-9]+$/.test(this._credentialData)
      );
    }
    return true;
  }

  private _handleTypeChange(ev: CustomEvent): void {
    this._credentialType = ev.detail.value as MatterLockCredentialType;
    this._credentialData = "";
  }

  private _handleDataChange(ev: InputEvent): void {
    this._credentialData = (ev.target as HTMLInputElement).value;
  }

  private async _save(): Promise<void> {
    if (!this._params) {
      return;
    }

    this._saving = true;

    try {
      await setMatterLockCredential(this.hass, this._params.device_id, {
        user_index: this._params.userIndex,
        credential_type: this._credentialType,
        credential_index: this._params.credential?.credential_index ?? null,
        credential_data: this._credentialData,
      });

      this._params.onSaved();
      this.closeDialog();
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.matter.lock.errors.save_failed"
        ),
        text: (err as Error).message,
      });
    } finally {
      this._saving = false;
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    this._credentialType = "pin";
    this._credentialData = "";
    this._saving = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-lock-credential-edit": DialogMatterLockCredentialEdit;
  }
}
