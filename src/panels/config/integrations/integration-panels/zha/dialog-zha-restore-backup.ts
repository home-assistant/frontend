import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiFileUpload } from "@mdi/js";

import { nothing } from "lit";
import { fireEvent } from "../../../../../../src/common/dom/fire_event";

import {
  ZHANetworkBackup,
  listZHANetworkBackups,
  restoreZHANetworkBackup,
} from "../../../../../data/zha";

import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../../src/dialogs/generic/show-dialog-box";

import { createCloseHeading } from "../../../../../components/ha-dialog";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";

import { HaRadio } from "../../../../../../src/components/ha-radio";
import "../../../../../../src/components/ha-select";
import "../../../../../../src/components/data-table/ha-data-table";

import "../../../../../components/ha-file-upload";
import "@material/mwc-button/mwc-button";

enum BackupType {
  Automatic = "automatic",
  Manual = "manual",
}

@customElement("dialog-zha-restore-backup")
class DialogZHARestoreBackup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _uploadingBackup = false;

  @state() private _currentBackups?: ZHANetworkBackup[];

  @state() private _backupFile?: File;
  @state() private _backupType?: BackupType;
  @state() private _chosenBackup?: ZHANetworkBackup;

  public async showDialog(): Promise<void> {
    this._currentBackups = await listZHANetworkBackups(this.hass);
  }

  public closeDialog(): void {
    this._backupFile = undefined;
    this._backupType = undefined;
    this._chosenBackup = undefined;
    this._currentBackups = undefined;

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _formatBackupLabel(backup: ZHANetworkBackup): string {
    const backupTime = new Date(Date.parse(backup.backup_time));
    return `${backupTime.toLocaleString()} (${backup.network_info.pan_id} / ${
      backup.network_info.extended_pan_id
    }, ${backup.network_info.source})`;
  }

  protected render(): TemplateResult {
    if (!this._currentBackups) {
      return html``;
    }

    // Sort the backups by their timestamp
    const sortedBackups: ZHANetworkBackup[] = this._currentBackups!.slice(
      0
    ).sort((a, b) => Date.parse(b.backup_time) - Date.parse(a.backup_time));

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.dialogs.zha_network_restore.restore_backup")
        )}
      >
        <div class="dialog-content">
          <p>
            Network backups can only restore the state of the <em>coordinator</em>,
            not any other device on the network. They can be used to migrate between
            coordinators (for example, a Conbee II to a CC2652).
          </p>

          <p>Choose a backup source:</p>

          <div>
            <ha-formfield .label=${"Automatic backup"}>
              <ha-radio
                name="backupType"
                .value=${BackupType.Automatic}
                .checked=${this._backupType === BackupType.Automatic}
                @change=${this._handleBackupTypeChange}
              ></ha-radio>
            </ha-formfield>

            <ha-formfield .label=${"Manual backup"}>
              <ha-radio
                name="backupType"
                .value=${BackupType.Manual}
                .checked=${this._backupType === BackupType.Manual}
                @change=${this._handleBackupTypeChange}
              ></ha-radio>
            </ha-formfield>
          </div>

          ${
            this._backupType === BackupType.Automatic
              ? html`
                  <p>Select a backup:</p>
                  <div>
                    ${sortedBackups.map(
                      (backup) => html`
                        <ha-formfield .label=${this._formatBackupLabel(backup)}>
                          <ha-radio
                            name="chosenAutomaticBackup"
                            @change=${this._handleAutomaticBackupChanged}
                            .value=${backup}
                          ></ha-radio>
                        </ha-formfield>
                      `
                    )}
                  </div>
                `
              : nothing
          }

          ${
            this._backupType === BackupType.Manual
              ? html`
                  <div>
                    <ha-file-upload
                      .hass=${this.hass}
                      .uploading=${this._uploadingBackup}
                      .icon=${mdiFileUpload}
                      accept=".json,application/json"
                      label=${this._backupFile?.name ??
                      this.hass.localize(
                        "ui.panel.config.zha.network.upload_backup"
                      )}
                      @file-picked=${this._uploadFile}
                    ></ha-file-upload>
                  </div>
                `
              : nothing
          }

        <div class="dialog-actions">
          <mwc-button
            class="warning"
            @click=${this._beginRestore}
            .disabled=${!this._chosenBackup}
          >
            ${this.hass.localize("ui.panel.config.zha.network.restore_backup")}
          </mwc-button>
        </div>
      </ha-dialog>
    `;
  }

  private _handleBackupTypeChange(ev: CustomEvent) {
    const target = ev.currentTarget! as HaRadio;
    this._backupType = target.value as BackupType;
    this._chosenBackup = undefined;
  }

  private _handleAutomaticBackupChanged(ev: CustomEvent) {
    const target = ev.currentTarget! as HaRadio;

    // `.value` can be more than a string
    this._chosenBackup = target.value as unknown as ZHANetworkBackup;
  }

  private async _uploadFile(ev) {
    this._chosenBackup = undefined;

    this._uploadingBackup = true;
    const backupContents: string = await ev.detail.files[0].text();
    this._uploadingBackup = false;

    this._chosenBackup = JSON.parse(backupContents) as ZHANetworkBackup;
  }

  private async _beginRestore(): Promise<void> {
    const restoreConfirmation: boolean = await showConfirmationDialog(this, {
      title: "Are you sure you want to restore this network backup?",
      text: "The existing network settings on this coordinator will be overwritten.",
      confirmText: "Restore",
      dismissText: "Cancel",
    });

    if (!restoreConfirmation) {
      return;
    }

    await restoreZHANetworkBackup(this.hass, this._chosenBackup!);

    await showAlertDialog(this, {
      title: "Restore succeeded",
      text: "The network settings have been successfully written. It can take a few minutes for routes to existing devices to be rebuilt.",
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      haStyle,
      css`
        ha-select {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-restore-backup": DialogZHARestoreBackup;
  }
}
