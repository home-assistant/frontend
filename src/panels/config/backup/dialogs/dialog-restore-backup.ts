import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-form/ha-form";

import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import "../../../../components/ha-svg-icon";
import {
  fetchBackupConfig,
  getPreferredAgentForDownload,
  restoreBackup,
} from "../../../../data/backup";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { RestoreBackupDialogParams } from "./show-dialog-restore-backup";

type FormData = {
  encryption_key_type: "config" | "custom";
  custom_encryption_key: string;
};

const INITIAL_DATA: FormData = {
  encryption_key_type: "config",
  custom_encryption_key: "",
};

const STEPS = ["confirm", "encryption", "progress"] as const;

@customElement("ha-dialog-restore-backup")
class DialogRestoreBackup extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _step?: "confirm" | "encryption" | "progress";

  @state() private _params?: RestoreBackupDialogParams;

  @state() private _formData?: FormData;

  @state() private _backupEncryptionKey?: string;

  @state() private _userPassword?: string;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(params: RestoreBackupDialogParams) {
    this._params = params;

    this._formData = INITIAL_DATA;
    if (this._params.backup.protected) {
      this._backupEncryptionKey = await this._fetchEncryptionKey();
      if (!this._backupEncryptionKey) {
        this._step = STEPS[1];
      } else {
        this._step = STEPS[0];
      }
    } else {
      this._step = STEPS[0];
    }
  }

  public closeDialog() {
    this._dialog?.close();
  }

  private _dialogClosed() {
    this._formData = undefined;
    this._params = undefined;
    this._backupEncryptionKey = undefined;
    this._userPassword = undefined;
    this._step = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _fetchEncryptionKey() {
    try {
      const { config } = await fetchBackupConfig(this.hass);
      return config.create_backup.password || undefined;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return undefined;
    }
  }

  protected render() {
    if (!this._step || !this._params || !this._formData) {
      return nothing;
    }

    const dialogTitle = "Restore backup";

    return html`
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.dialogs.generic.close")}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span slot="title" .title=${dialogTitle}>${dialogTitle}</span>
        </ha-dialog-header>
        <div slot="content" class="content">
          ${this._step === "confirm"
            ? this._renderConfirm()
            : this._step === "encryption"
              ? this._renderEncryption()
              : this._renderProgress()}
        </div>
        <div slot="actions">
          ${this._step === "confirm"
            ? this._renderConfirmActions()
            : this._step === "encryption"
              ? this._renderEncryptionActions()
              : nothing}
        </div>
      </ha-md-dialog>
    `;
  }

  private _renderConfirm() {
    return html`<p>
      Your backup will be restored and all current data will be overwritten.
      Depending on the size of the backup, this can take a while.
    </p>`;
  }

  private _renderConfirmActions() {
    return html`<ha-button @click=${this.closeDialog}>Cancel</ha-button
      ><ha-button @click=${this._restoreBackup} class="destructive"
        >Restore</ha-button
      >`;
  }

  private _renderEncryption() {
    return html`<p>
        ${this._userPassword
          ? "The provided encryption key was incorrect, please try again"
          : this._backupEncryptionKey
            ? "The backup is encrypted with a different key or password than that is saved on this system. Please enter the key for this backup."
            : "The backup is encrypted. Provide the encryption key to decrypt the backup."}
      </p>
      <ha-password-field
        @change=${this._passwordChanged}
        .value=${this._userPassword}
      ></ha-password-field>`;
  }

  private _renderEncryptionActions() {
    return html`<ha-button @click=${this._restoreBackup}>Restore</ha-button>`;
  }

  private _renderProgress() {
    return html`<ha-circular-progress active></ha-circular-progress>`;
  }

  private _passwordChanged(ev): void {
    this._userPassword = ev.target.value;
  }

  private async _restoreBackup() {
    try {
      this._step = "progress";
      await this._doRestoreBackup(
        this._userPassword || this._backupEncryptionKey
      );
      this.closeDialog();
    } catch (e) {
      this._step = "encryption";
    }
  }

  private async _doRestoreBackup(password?: string) {
    const preferedAgent = getPreferredAgentForDownload(
      this._params.backup.agent_ids!
    );

    const { addons, database_included, homeassistant_included, folders } =
      this._params.selectedData;

    await restoreBackup(this.hass, {
      backup_id: this._params.backup.backup_id,
      agent_id: preferedAgent,
      password,
      restore_addons: addons.map((addon) => addon.slug),
      restore_database: database_included,
      restore_folders: folders,
      restore_homeassistant: homeassistant_included,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-md-dialog {
          max-width: 500px;
          width: 100%;
        }
        .content p {
          margin: 0 0 16px;
        }
        .destructive {
          --mdc-theme-primary: var(--error-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-restore-backup": DialogRestoreBackup;
  }
}