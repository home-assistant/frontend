import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-header-bar";
import "../../../../src/components/ha-icon-button";
import { HassDialog } from "../../../../src/dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/hassio-upload-backup";
import { HassioBackupUploadDialogParams } from "./show-dialog-backup-upload";

@customElement("dialog-hassio-backup-upload")
export class DialogHassioBackupUpload
  extends LitElement
  implements HassDialog<HassioBackupUploadDialogParams>
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _dialogParams?: HassioBackupUploadDialogParams;

  public async showDialog(
    dialogParams: HassioBackupUploadDialogParams
  ): Promise<void> {
    this._dialogParams = dialogParams;
    await this.updateComplete;
  }

  public closeDialog(): void {
    if (this._dialogParams && !this._dialogParams.onboarding) {
      if (this._dialogParams.reloadBackup) {
        this._dialogParams.reloadBackup();
      }
    }
    this._dialogParams = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        hideActions
        .heading=${this.hass?.localize(
          "ui.panel.page-onboarding.restore.upload_backup"
        ) || "Upload backup"}
        @closed=${this.closeDialog}
      >
        <div slot="heading">
          <ha-header-bar>
            <span slot="title"
              >${this.hass?.localize(
                "ui.panel.page-onboarding.restore.upload_backup"
              ) || "Upload backup"}</span
            >
            <ha-icon-button
              .label=${this.hass?.localize("ui.common.close") || "Close"}
              .path=${mdiClose}
              slot="actionItems"
              dialogAction="cancel"
              dialogInitialFocus
            ></ha-icon-button>
          </ha-header-bar>
        </div>
        <hassio-upload-backup
          @backup-uploaded=${this._backupUploaded}
          .hass=${this.hass}
        ></hassio-upload-backup>
      </ha-dialog>
    `;
  }

  private _backupUploaded(ev) {
    const backup = ev.detail.backup;
    this._dialogParams?.showBackup(backup.slug);
    this.closeDialog();
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
    "dialog-hassio-backup-upload": DialogHassioBackupUpload;
  }
}
