import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-alert";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import {
  createHassioFullBackup,
  createHassioPartialBackup,
} from "../../../../src/data/hassio/backup";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { showAlertDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import "../../components/supervisor-backup-content";
import type { SupervisorBackupContent } from "../../components/supervisor-backup-content";
import { HassioCreateBackupDialogParams } from "./show-dialog-hassio-create-backup";

@customElement("dialog-hassio-create-backup")
class HassioCreateBackupDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: HassioCreateBackupDialogParams;

  @state() private _error?: string;

  @state() private _creatingBackup = false;

  @query("supervisor-backup-content")
  private _backupContent!: SupervisorBackupContent;

  public showDialog(dialogParams: HassioCreateBackupDialogParams) {
    this._dialogParams = dialogParams;
    this._creatingBackup = false;
  }

  public closeDialog() {
    this._dialogParams = undefined;
    this._creatingBackup = false;
    this._error = undefined;
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
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this._dialogParams.supervisor.localize("backup.create_backup")
        )}
      >
        ${this._creatingBackup
          ? html`<ha-circular-progress active></ha-circular-progress>`
          : html`<supervisor-backup-content
              .hass=${this.hass}
              .supervisor=${this._dialogParams.supervisor}
              dialogInitialFocus
            >
            </supervisor-backup-content>`}
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
        <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
          ${this._dialogParams.supervisor.localize("common.close")}
        </mwc-button>
        <mwc-button
          .disabled=${this._creatingBackup}
          slot="primaryAction"
          @click=${this._createBackup}
        >
          ${this._dialogParams.supervisor.localize("backup.create")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private async _createBackup(): Promise<void> {
    if (this._dialogParams!.supervisor.info.state !== "running") {
      showAlertDialog(this, {
        title: this._dialogParams!.supervisor.localize(
          "backup.could_not_create"
        ),
        text: this._dialogParams!.supervisor.localize(
          "backup.create_blocked_not_running",
          { state: this._dialogParams!.supervisor.info.state }
        ),
      });
      return;
    }
    const backupDetails = this._backupContent.backupDetails();
    this._creatingBackup = true;

    this._error = "";
    if (backupDetails.password && !backupDetails.password.length) {
      this._error = this._dialogParams!.supervisor.localize(
        "backup.enter_password"
      );
      this._creatingBackup = false;
      return;
    }
    if (
      backupDetails.password &&
      backupDetails.password !== backupDetails.confirm_password
    ) {
      this._error = this._dialogParams!.supervisor.localize(
        "backup.passwords_not_matching"
      );
      this._creatingBackup = false;
      return;
    }

    delete backupDetails.confirm_password;

    try {
      if (this._backupContent.backupType === "full") {
        await createHassioFullBackup(this.hass, backupDetails);
      } else {
        await createHassioPartialBackup(this.hass, backupDetails);
      }

      this._dialogParams!.onCreate();
      this.closeDialog();
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
    }
    this._creatingBackup = false;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-circular-progress {
          display: block;
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-create-backup": HassioCreateBackupDialog;
  }
}
