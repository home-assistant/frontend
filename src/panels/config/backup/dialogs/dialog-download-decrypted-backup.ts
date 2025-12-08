import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-wa-dialog";
import "../../../../components/ha-password-field";
import {
  canDecryptBackupOnDownload,
  getPreferredAgentForDownload,
} from "../../../../data/backup";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { downloadBackupFile } from "../helper/download_backup";
import type { DownloadDecryptedBackupDialogParams } from "./show-dialog-download-decrypted-backup";

@customElement("ha-dialog-download-decrypted-backup")
class DialogDownloadDecryptedBackup extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _params?: DownloadDecryptedBackupDialogParams;

  @state() private _encryptionKey = "";

  @state() private _error = "";

  public showDialog(params: DownloadDecryptedBackupDialogParams): void {
    this._open = true;
    this._params = params;
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    if (this._open) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._open = false;
    this._params = undefined;
    this._encryptionKey = "";
    this._error = "";
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.backup.dialogs.download.title"
        )}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        <p>
          ${this.hass.localize(
            "ui.panel.config.backup.dialogs.download.description"
          )}
        </p>
        <p>
          ${this.hass.localize(
            "ui.panel.config.backup.dialogs.download.download_backup_encrypted",
            {
              download_it_encrypted: html`<button
                class="link"
                @click=${this._downloadEncrypted}
              >
                ${this.hass.localize(
                  "ui.panel.config.backup.dialogs.download.download_it_encrypted"
                )}
              </button>`,
            }
          )}
        </p>

        <ha-password-field
          .label=${this.hass.localize(
            "ui.panel.config.backup.dialogs.download.encryption_key"
          )}
          @input=${this._keyChanged}
        ></ha-password-field>

        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._cancel}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>

          <ha-button slot="primaryAction" @click=${this._submit}>
            ${this.hass.localize(
              "ui.panel.config.backup.dialogs.download.download"
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _cancel() {
    this.closeDialog();
  }

  private async _submit() {
    if (this._encryptionKey === "") {
      return;
    }
    try {
      await canDecryptBackupOnDownload(
        this.hass,
        this._params!.backup.backup_id,
        this._agentId,
        this._encryptionKey
      );
      downloadBackupFile(
        this.hass,
        this._params!.backup.backup_id,
        this._agentId,
        this._encryptionKey
      );
      this.closeDialog();
    } catch (err: any) {
      if (err?.code === "password_incorrect") {
        this._error = this.hass.localize(
          "ui.panel.config.backup.dialogs.download.incorrect_encryption_key"
        );
      } else if (err?.code === "decrypt_not_supported") {
        this._error = this.hass.localize(
          "ui.panel.config.backup.dialogs.download.decryption_not_supported"
        );
      } else {
        alert(err.message);
      }
    }
  }

  private _keyChanged(ev) {
    this._encryptionKey = ev.currentTarget.value;
    this._error = "";
  }

  private get _agentId() {
    if (this._params?.agentId) {
      return this._params.agentId;
    }
    return getPreferredAgentForDownload(
      Object.keys(this._params!.backup.agents)
    );
  }

  private async _downloadEncrypted() {
    downloadBackupFile(
      this.hass,
      this._params!.backup.backup_id,
      this._agentId
    );
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-wa-dialog {
          --dialog-content-padding: var(--ha-space-2) var(--ha-space-6);
        }

        button.link {
          background: none;
          border: none;
          padding: 0;
          font-size: var(--ha-font-size-m);
          color: var(--primary-color);
          text-decoration: underline;
          cursor: pointer;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-download-decrypted-backup": DialogDownloadDecryptedBackup;
  }
}
