import type { ActionDetail } from "@material/mwc-list";

import { mdiClose, mdiDotsVertical } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { atLeastVersion } from "../../../../src/common/config/version";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { stopPropagation } from "../../../../src/common/dom/stop_propagation";
import { slugify } from "../../../../src/common/string/slugify";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-button";
import "../../../../src/components/ha-button-menu";
import "../../../../src/components/ha-dialog-header";
import "../../../../src/components/ha-header-bar";
import "../../../../src/components/ha-icon-button";
import "../../../../src/components/ha-list-item";
import "../../../../src/components/ha-md-dialog";
import type { HaMdDialog } from "../../../../src/components/ha-md-dialog";
import "../../../../src/components/ha-spinner";
import { getSignedPath } from "../../../../src/data/auth";
import type { HassioBackupDetail } from "../../../../src/data/hassio/backup";
import {
  fetchHassioBackupInfo,
  removeBackup,
  restoreBackup,
} from "../../../../src/data/hassio/backup";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../src/dialogs/generic/show-dialog-box";
import type { HassDialog } from "../../../../src/dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { fileDownload } from "../../../../src/util/file_download";
import "../../components/supervisor-backup-content";
import type { SupervisorBackupContent } from "../../components/supervisor-backup-content";
import type { HassioBackupDialogParams } from "./show-dialog-hassio-backup";

@customElement("dialog-hassio-backup")
class HassioBackupDialog
  extends LitElement
  implements HassDialog<HassioBackupDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _backup?: HassioBackupDetail;

  @state() private _dialogParams?: HassioBackupDialogParams;

  @state() private _restoringBackup = false;

  @query("supervisor-backup-content")
  private _backupContent!: SupervisorBackupContent;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(dialogParams: HassioBackupDialogParams) {
    this._dialogParams = dialogParams;
    this._backup = await fetchHassioBackupInfo(this.hass, dialogParams.slug);
    if (!this._backup) {
      this._error = this._dialogParams.supervisor?.localize(
        "backup.no_backup_found"
      );
    } else if (this._dialogParams.onboarding && !this._backup.homeassistant) {
      this._error = this._dialogParams.supervisor?.localize(
        "backup.restore_no_home_assistant"
      );
    }
    this._restoringBackup = false;
  }

  private _dialogClosed(): void {
    this._backup = undefined;
    this._dialogParams = undefined;
    this._restoringBackup = false;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog() {
    this._dialog?.close();
    return true;
  }

  protected render() {
    if (!this._dialogParams || !this._backup) {
      return nothing;
    }
    return html`
      <ha-md-dialog
        open
        .disableCancelAction=${!this._error}
        @closed=${this._dialogClosed}
      >
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this._dialogParams.supervisor?.localize("backup.close")}
            .path=${mdiClose}
            @click=${this.closeDialog}
            .disabled=${this._restoringBackup}
          ></ha-icon-button>
          <span slot="title" .title=${this._backup.name}
            >${this._backup.name}</span
          >
          ${!this._dialogParams.onboarding && this._dialogParams.supervisor
            ? html`<ha-button-menu
                slot="actionItems"
                fixed
                @action=${this._handleMenuAction}
                @closed=${stopPropagation}
              >
                <ha-icon-button
                  .label=${this._dialogParams.supervisor.localize(
                    "backup.more_actions"
                  )}
                  .path=${mdiDotsVertical}
                  slot="trigger"
                ></ha-icon-button>
                <ha-list-item
                  >${this._dialogParams.supervisor.localize(
                    "backup.download_backup"
                  )}</ha-list-item
                >
                <ha-list-item class="error"
                  >${this._dialogParams.supervisor.localize(
                    "backup.delete_backup_title"
                  )}</ha-list-item
                >
              </ha-button-menu>`
            : nothing}
        </ha-dialog-header>
        <div slot="content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : this._restoringBackup
              ? html`<div class="loading">
                  <ha-spinner></ha-spinner>
                </div>`
              : html`
                  <supervisor-backup-content
                    .hass=${this.hass}
                    .supervisor=${this._dialogParams.supervisor}
                    .backup=${this._backup}
                    .onboarding=${this._dialogParams.onboarding || false}
                    dialogInitialFocus
                  >
                  </supervisor-backup-content>
                `}
        </div>
        <div slot="actions">
          <ha-button
            .disabled=${this._restoringBackup || !!this._error}
            @click=${this._restoreClicked}
          >
            ${this._dialogParams.supervisor?.localize("backup.restore")}
          </ha-button>
        </div>
      </ha-md-dialog>
    `;
  }

  private _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._downloadClicked();
        break;
      case 1:
        this._deleteClicked();
        break;
    }
  }

  private async _restoreClicked() {
    const backupDetails = this._backupContent.backupDetails();
    this._restoringBackup = true;

    const supervisor = this._dialogParams?.supervisor;
    if (supervisor !== undefined && supervisor.info.state !== "running") {
      await showAlertDialog(this, {
        title: supervisor.localize("backup.could_not_restore"),
        text: supervisor.localize("backup.restore_blocked_not_running", {
          state: supervisor.info.state,
        }),
      });
      this._restoringBackup = false;
      return;
    }
    if (
      !(await showConfirmationDialog(this, {
        title: supervisor?.localize(
          `backup.${
            this._backup!.type === "full"
              ? "confirm_restore_full_backup_title"
              : "confirm_restore_partial_backup_title"
          }`
        ),
        text: supervisor?.localize(
          `backup.${
            this._backup!.type === "full"
              ? "confirm_restore_full_backup_text"
              : "confirm_restore_partial_backup_text"
          }`
        ),
        confirmText: supervisor?.localize("backup.restore"),
        dismissText: supervisor?.localize("backup.cancel"),
      }))
    ) {
      this._restoringBackup = false;
      return;
    }

    try {
      await restoreBackup(
        this.hass,
        this._backup!.type,
        this._backup!.slug,
        { ...backupDetails, background: this._dialogParams?.onboarding },
        !!this.hass && atLeastVersion(this.hass.config.version, 2021, 9)
      );

      this._dialogParams?.onRestoring?.();
      this.closeDialog();
    } catch (error: any) {
      this._error =
        error?.body?.message ||
        supervisor?.localize("backup.restore_start_failed");
    } finally {
      this._restoringBackup = false;
    }
  }

  private async _deleteClicked() {
    const supervisor = this._dialogParams?.supervisor;
    if (!supervisor) return;

    if (
      !(await showConfirmationDialog(this, {
        title: supervisor!.localize("backup.confirm_delete_title"),
        text: supervisor!.localize("backup.confirm_delete_text"),
        confirmText: supervisor!.localize("backup.delete"),
        dismissText: supervisor!.localize("backup.cancel"),
        destructive: true,
      }))
    ) {
      return;
    }

    try {
      await removeBackup(this.hass!, this._backup!.slug);
      if (this._dialogParams!.onDelete) {
        this._dialogParams!.onDelete();
      }
      this.closeDialog();
    } catch (err: any) {
      this._error = err.body.message;
    }
  }

  private async _downloadClicked() {
    const supervisor = this._dialogParams?.supervisor;
    if (!supervisor) return;

    let signedPath: { path: string };
    try {
      signedPath = await getSignedPath(
        this.hass!,
        `/api/hassio/${
          atLeastVersion(this.hass!.config.version, 2021, 9)
            ? "backups"
            : "snapshots"
        }/${this._backup!.slug}/download`
      );
    } catch (err: any) {
      await showAlertDialog(this, {
        text: extractApiErrorMessage(err),
      });
      return;
    }

    if (window.location.href.includes("ui.nabu.casa")) {
      const confirm = await showConfirmationDialog(this, {
        title: supervisor.localize("backup.remote_download_title"),
        text: supervisor.localize("backup.remote_download_text"),
        confirmText: supervisor.localize("backup.download"),
        dismissText: supervisor?.localize("backup.cancel"),
      });
      if (!confirm) {
        return;
      }
    }

    fileDownload(
      signedPath.path,
      `home_assistant_backup_${slugify(this._computeName)}.tar`
    );
  }

  private get _computeName() {
    return this._backup
      ? this._backup.name || this._backup.slug
      : this._dialogParams!.supervisor?.localize("backup.unnamed_backup") || "";
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
          display: block;
        }
        ha-icon-button {
          color: var(--secondary-text-color);
        }
        .loading {
          width: 100%;
          display: flex;
          height: 100%;
          justify-content: center;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-backup": HassioBackupDialog;
  }
}
