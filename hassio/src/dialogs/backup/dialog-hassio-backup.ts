import { ActionDetail } from "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiClose, mdiDotsVertical } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { slugify } from "../../../../src/common/string/slugify";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-button-menu";
import "../../../../src/components/ha-header-bar";
import "../../../../src/components/ha-svg-icon";
import { getSignedPath } from "../../../../src/data/auth";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import {
  fetchHassioBackupInfo,
  HassioBackupDetail,
} from "../../../../src/data/hassio/backup";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../src/dialogs/generic/show-dialog-box";
import { HassDialog } from "../../../../src/dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { fileDownload } from "../../../../src/util/file_download";
import "../../components/supervisor-backup-content";
import type { SupervisorBackupContent } from "../../components/supervisor-backup-content";
import { HassioBackupDialogParams } from "./show-dialog-hassio-backup";
import { atLeastVersion } from "../../../../src/common/config/version";

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

  public async showDialog(params: HassioBackupDialogParams) {
    this._backup = await fetchHassioBackupInfo(this.hass, params.slug);
    this._dialogParams = params;
    this._restoringBackup = false;
  }

  public closeDialog() {
    this._backup = undefined;
    this._dialogParams = undefined;
    this._restoringBackup = false;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._dialogParams || !this._backup) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        @closed=${this.closeDialog}
        .heading=${true}
      >
        <div slot="heading">
          <ha-header-bar>
            <span slot="title">${this._backup.name}</span>
            <mwc-icon-button slot="actionItems" dialogAction="cancel">
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </mwc-icon-button>
          </ha-header-bar>
        </div>
        ${this._restoringBackup
          ? html` <ha-circular-progress active></ha-circular-progress>`
          : html`<supervisor-backup-content
              .hass=${this.hass}
              .supervisor=${this._dialogParams.supervisor}
              .backup=${this._backup}
              .onboarding=${this._dialogParams.onboarding || false}
              .localize=${this._dialogParams.localize}
            >
            </supervisor-backup-content>`}
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}

        <mwc-button
          .disabled=${this._restoringBackup}
          slot="secondaryAction"
          @click=${this._restoreClicked}
        >
          Restore
        </mwc-button>

        ${!this._dialogParams.onboarding
          ? html`<ha-button-menu
              fixed
              slot="primaryAction"
              @action=${this._handleMenuAction}
              @closed=${(ev: Event) => ev.stopPropagation()}
            >
              <mwc-icon-button slot="trigger" alt="menu">
                <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
              </mwc-icon-button>
              <mwc-list-item>Download Backup</mwc-list-item>
              <mwc-list-item class="error">Delete Backup</mwc-list-item>
            </ha-button-menu>`
          : ""}
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-svg-icon {
          color: var(--primary-text-color);
        }
        ha-circular-progress {
          display: block;
          text-align: center;
        }
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
          display: block;
        }
      `,
    ];
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
    if (this._backupContent.backupType === "full") {
      await this._fullRestoreClicked(backupDetails);
    } else {
      await this._partialRestoreClicked(backupDetails);
    }
    this._restoringBackup = false;
  }

  private async _partialRestoreClicked(backupDetails) {
    if (
      this._dialogParams?.supervisor !== undefined &&
      this._dialogParams?.supervisor.info.state !== "running"
    ) {
      await showAlertDialog(this, {
        title: "Could not restore backup",
        text: `Restoring a backup is not possible right now because the system is in ${this._dialogParams?.supervisor.info.state} state.`,
      });
      return;
    }
    if (
      !(await showConfirmationDialog(this, {
        title: "Are you sure you want partially to restore this backup?",
        confirmText: "restore",
        dismissText: "cancel",
      }))
    ) {
      return;
    }

    if (!this._dialogParams?.onboarding) {
      this.hass
        .callApi(
          "POST",

          `hassio/${
            atLeastVersion(this.hass.config.version, 2021, 9)
              ? "backups"
              : "snapshots"
          }/${this._backup!.slug}/restore/partial`,
          backupDetails
        )
        .then(
          () => {
            this.closeDialog();
          },
          (error) => {
            this._error = error.body.message;
          }
        );
    } else {
      fireEvent(this, "restoring");
      fetch(`/api/hassio/backups/${this._backup!.slug}/restore/partial`, {
        method: "POST",
        body: JSON.stringify(backupDetails),
      });
      this.closeDialog();
    }
  }

  private async _fullRestoreClicked(backupDetails) {
    if (
      this._dialogParams?.supervisor !== undefined &&
      this._dialogParams?.supervisor.info.state !== "running"
    ) {
      await showAlertDialog(this, {
        title: "Could not restore backup",
        text: `Restoring a backup is not possible right now because the system is in ${this._dialogParams?.supervisor.info.state} state.`,
      });
      return;
    }
    if (
      !(await showConfirmationDialog(this, {
        title:
          "Are you sure you want to wipe your system and restore this backup?",
        confirmText: "restore",
        dismissText: "cancel",
      }))
    ) {
      return;
    }

    if (!this._dialogParams?.onboarding) {
      this.hass
        .callApi(
          "POST",
          `hassio/${
            atLeastVersion(this.hass.config.version, 2021, 9)
              ? "backups"
              : "snapshots"
          }/${this._backup!.slug}/restore/full`,
          backupDetails
        )
        .then(
          () => {
            this.closeDialog();
          },
          (error) => {
            this._error = error.body.message;
          }
        );
    } else {
      fireEvent(this, "restoring");
      fetch(`/api/hassio/backups/${this._backup!.slug}/restore/full`, {
        method: "POST",
        body: JSON.stringify(backupDetails),
      });
      this.closeDialog();
    }
  }

  private async _deleteClicked() {
    if (
      !(await showConfirmationDialog(this, {
        title: "Are you sure you want to delete this backup?",
        confirmText: "delete",
        dismissText: "cancel",
      }))
    ) {
      return;
    }

    this.hass

      .callApi(
        atLeastVersion(this.hass.config.version, 2021, 9) ? "DELETE" : "POST",
        `hassio/${
          atLeastVersion(this.hass.config.version, 2021, 9)
            ? `backups/${this._backup!.slug}`
            : `snapshots/${this._backup!.slug}/remove`
        }`
      )
      .then(
        () => {
          if (this._dialogParams!.onDelete) {
            this._dialogParams!.onDelete();
          }
          this.closeDialog();
        },
        (error) => {
          this._error = error.body.message;
        }
      );
  }

  private async _downloadClicked() {
    let signedPath: { path: string };
    try {
      signedPath = await getSignedPath(
        this.hass,
        `/api/hassio/${
          atLeastVersion(this.hass.config.version, 2021, 9)
            ? "backups"
            : "snapshots"
        }/${this._backup!.slug}/download`
      );
    } catch (err) {
      await showAlertDialog(this, {
        text: extractApiErrorMessage(err),
      });
      return;
    }

    if (window.location.href.includes("ui.nabu.casa")) {
      const confirm = await showConfirmationDialog(this, {
        title: "Potential slow download",
        text: "Downloading backups over the Nabu Casa URL will take some time, it is recomended to use your local URL instead, do you want to continue?",
        confirmText: "continue",
        dismissText: "cancel",
      });
      if (!confirm) {
        return;
      }
    }

    fileDownload(
      this,
      signedPath.path,
      `home_assistant_backup_${slugify(this._computeName)}.tar`
    );
  }

  private get _computeName() {
    return this._backup
      ? this._backup.name || this._backup.slug
      : "Unnamed backup";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-backup": HassioBackupDialog;
  }
}
