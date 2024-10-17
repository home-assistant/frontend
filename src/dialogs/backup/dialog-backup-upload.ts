import { mdiClose, mdiFolderUpload } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-alert";
import "../../components/ha-file-upload";
import "../../components/ha-header-bar";
import "../../components/ha-icon-button";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { BackupUploadDialogParams } from "./show-dialog-backup-upload";
import { HassDialog } from "../make-dialog-manager";
import { showAlertDialog } from "../generic/show-dialog-box";
import { uploadBackup } from "../../data/backup";

const SUPPORTED_FORMAT = "application/x-tar";

@customElement("dialog-backup-upload")
export class DialogBackupUpload
  extends LitElement
  implements HassDialog<BackupUploadDialogParams>
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _dialogParams?: BackupUploadDialogParams;

  @state() private _uploading = false;

  @state() private _error?: string;

  public async showDialog(
    dialogParams: BackupUploadDialogParams
  ): Promise<void> {
    this._dialogParams = dialogParams;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._dialogParams = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._dialogParams || !this.hass) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        hideActions
        heading="Upload backup"
        @closed=${this.closeDialog}
      >
        <div slot="heading">
          <ha-header-bar>
            <span slot="title"> Upload backup </span>
            <ha-icon-button
              .label=${this.hass.localize("ui.common.close")}
              .path=${mdiClose}
              slot="actionItems"
              dialogAction="cancel"
              dialogInitialFocus
            ></ha-icon-button>
          </ha-header-bar>
        </div>
        <ha-file-upload
          .hass=${this.hass}
          .uploading=${this._uploading}
          .icon=${mdiFolderUpload}
          accept=${SUPPORTED_FORMAT}
          label="Upload a backup"
          supports="Supports .tar files"
          @file-picked=${this._uploadFile}
        ></ha-file-upload>
        ${this._error
          ? html`<ha-alert alertType="error">${this._error}</ha-alert>`
          : nothing}
      </ha-dialog>
    `;
  }

  private async _uploadFile(ev: CustomEvent<{ files: File[] }>): Promise<void> {
    this._error = undefined;
    const file = ev.detail.files[0];

    if (file.type !== SUPPORTED_FORMAT) {
      showAlertDialog(this, {
        title: "Unsupported file format",
        text: "Please choose a Home Assistant backup file (.tar)",
        confirmText: "ok",
      });
      return;
    }
    this._uploading = true;
    try {
      await uploadBackup(this.hass!, file);
      this._dialogParams!.onUploadComplete();
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message;
    } finally {
      this._uploading = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
        }
        /* overrule the ha-style-dialog max-height on small screens */
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-header-bar {
            --mdc-theme-primary: var(--app-header-background-color);
            --mdc-theme-on-primary: var(--app-header-text-color, white);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-backup-upload": DialogBackupUpload;
  }
}
