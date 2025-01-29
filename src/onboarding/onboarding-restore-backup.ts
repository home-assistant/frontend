import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "./restore-backup/onboarding-restore-backup-upload";
import "./restore-backup/onboarding-restore-backup-details";
import "./restore-backup/onboarding-restore-backup-restore";
import "./restore-backup/onboarding-restore-backup-status";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-card";
import "../components/ha-icon-button-arrow-prev";
import "../components/ha-circular-progress";
import "../components/ha-alert";
import "./onboarding-loading";
import { removeSearchParam } from "../common/url/search-params";
import { navigate } from "../common/navigate";
import { onBoardingStyles } from "./styles";
import {
  fetchBackupOnboardingInfo,
  type BackupOnboardingInfo,
} from "../data/backup_onboarding";
import type { BackupContentExtended, BackupData } from "../data/backup";
import { showConfirmationDialog } from "../dialogs/generic/show-dialog-box";

const STORAGE_BACKUP_ID_KEY = "onboarding-restore-backup-backup-id";
const STORAGE_RESTORE_RUNNING = "onboarding-restore-running";
const STATUS_INTERVAL_IN_MS = 5000;

@customElement("onboarding-restore-backup")
class OnboardingRestoreBackup extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property() public language!: string;

  @property({ type: Boolean }) public supervisor = false;

  @state() private _view:
    | "loading"
    | "upload"
    | "details"
    | "restore"
    | "status" = "loading";

  @state() private _backup?: BackupContentExtended;

  @state() private _backupInfo?: BackupOnboardingInfo;

  @state() private _selectedData?: BackupData;

  @state() private _error?: string;

  @state() private _failed?: boolean;

  protected render(): TemplateResult {
    return html`
      ${
        this._view !== "status" || this._failed
          ? html`<ha-icon-button-arrow-prev
              .label=${this.localize(
                "ui.panel.page-onboarding.restore.no_backup_found"
              )}
              @click=${this._back}
            ></ha-icon-button-arrow-prev>`
          : nothing
      }
      </ha-icon-button>
      <h1>${this.localize("ui.panel.page-onboarding.restore.header")}</h1>
      ${
        this._error
          ? html` <ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      ${
        this._failed && this._view !== "status"
          ? html`<ha-alert
              alert-type="error"
              .title=${this.localize("ui.panel.page-onboarding.restore.failed")}
              >${this.localize(
                `ui.panel.page-onboarding.restore.${this._backupInfo?.last_non_idle_event?.reason === "password_incorrect" ? "failed_wrong_password_description" : "failed_description"}`
              )}</ha-alert
            >`
          : nothing
      }
      ${
        this._view === "loading"
          ? html`<div class="loading">
              <ha-circular-progress indeterminate></ha-circular-progress>
            </div>`
          : nothing
      }
      ${
        this._view === "upload"
          ? html`
              <onboarding-restore-backup-upload
                ?supervisor=${this.supervisor}
                .localize=${this.localize}
                @backup-uploaded=${this._backupUploaded}
              ></onboarding-restore-backup-upload>
            `
          : nothing
      }
      ${
        this._view === "details"
          ? html`<onboarding-restore-backup-details
              .localize=${this.localize}
              .backup=${this._backup!}
              @backup-restore=${this._restore}
            ></onboarding-restore-backup-details>`
          : nothing
      }
      ${
        this._view === "restore"
          ? html`<onboarding-restore-backup-restore
              .localize=${this.localize}
              .backup=${this._backup!}
              ?supervisor=${this.supervisor}
              .selectedData=${this._selectedData!}
              @restore-started=${this._getRestoreStatus}
            ></onboarding-restore-backup-restore>`
          : nothing
      }
      ${
        this._view === "status" && this._backupInfo
          ? html`<onboarding-restore-backup-status
              .localize=${this.localize}
              .backupInfo=${this._backupInfo}
            ></onboarding-restore-backup-status>`
          : nothing
      }
      ${
        ["details", "restore"].includes(this._view) && this._backup
          ? html`<div class="backup-summary-wrapper">
              <ha-backup-details-summary
                translation-key-panel="page-onboarding.restore"
                show-upload-another
                .backup=${this._backup}
                .localize=${this.localize}
                @show-backup-upload=${this._reupload}
              ></ha-backup-details-summary>
            </div>`
          : nothing
      }
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    this._loadBackupInfo();
  }

  private async _loadBackupInfo() {
    const backupId = localStorage.getItem(STORAGE_BACKUP_ID_KEY);
    const restoreRunning = localStorage.getItem(STORAGE_RESTORE_RUNNING);

    try {
      const {
        last_non_idle_event: lastNonIdleEvent,
        state: currentState,
        backups,
      } = await fetchBackupOnboardingInfo();

      this._backupInfo = {
        state: currentState,
        last_non_idle_event: lastNonIdleEvent,
      };

      if (backupId) {
        this._backup = backups.find(({ backup_id }) => backup_id === backupId);
      }

      const failedRestore =
        lastNonIdleEvent?.manager_state === "restore_backup" &&
        lastNonIdleEvent?.state === "failed";

      if (failedRestore) {
        this._failed = true;
      }

      if (restoreRunning) {
        this._view = "status";
        if (failedRestore || currentState !== "restore_backup") {
          this._failed = true;
          localStorage.removeItem(STORAGE_RESTORE_RUNNING);
        } else {
          this._scheduleLoadBackupInfo();
        }
        return;
      }

      if (!lastNonIdleEvent || !backupId) {
        this._view = "upload";
        return;
      }

      if (
        this._backup &&
        (lastNonIdleEvent.manager_state === "receive_backup" || failedRestore)
      ) {
        if (!this.supervisor && this._backup.homeassistant_included) {
          this._selectedData = {
            homeassistant_included: true,
            folders: [],
            addons: [],
            homeassistant_version: this._backup.homeassistant_version,
            database_included: this._backup.database_included,
          };
          this._view = "restore";
        } else {
          this._view = "details";
        }
        return;
      }

      // fallback to upload
      this._view = "upload";
    } catch (err: any) {
      if (restoreRunning) {
        if (err.error === "Request error") {
          this._scheduleLoadBackupInfo();
          return;
        }

        // core seems to be back up restored
        if (err.status_code === 404) {
          localStorage.removeItem(STORAGE_RESTORE_RUNNING);
          localStorage.removeItem(STORAGE_BACKUP_ID_KEY);
          location.reload();
        }
      }

      this._error = err?.message || "Cannot get backup info";
      this._view = "upload";
    }
  }

  private _scheduleLoadBackupInfo() {
    setTimeout(() => this._loadBackupInfo(), STATUS_INTERVAL_IN_MS);
  }

  private async _backupUploaded(ev: CustomEvent) {
    localStorage.setItem(STORAGE_BACKUP_ID_KEY, ev.detail.backupId);
    await this._loadBackupInfo();
  }

  private async _getRestoreStatus() {
    if (this._backupInfo) {
      this._backupInfo.state = "restore_backup";
    }
    this._view = "status";
    localStorage.setItem(STORAGE_RESTORE_RUNNING, "true");
    await this._loadBackupInfo();
  }

  private _back() {
    if (this._view === "upload" || (this._view === "status" && this._failed)) {
      navigate(`${location.pathname}?${removeSearchParam("page")}`);
    } else {
      showConfirmationDialog(this, {
        title: this.localize(
          "ui.panel.page-onboarding.restore.return_to_onboarding.title"
        ),
        text: this.localize(
          "ui.panel.page-onboarding.restore.return_to_onboarding.text"
        ),
        confirmText: this.localize(
          "ui.panel.page-onboarding.restore.return_to_onboarding.yes"
        ),
        dismissText: this.localize("ui.panel.page-onboarding.restore.cancel"),
        confirm: () => {
          setTimeout(() => {
            navigate(`${location.pathname}?${removeSearchParam("page")}`);
          });
        },
      });
    }
  }

  private _restore(ev: CustomEvent) {
    if (!this._backup || !ev.detail.selectedData) {
      return;
    }
    this._selectedData = ev.detail.selectedData;

    this._view = "restore";
  }

  private _reupload() {
    this._backup = undefined;
    localStorage.removeItem(STORAGE_BACKUP_ID_KEY);
    this._view = "upload";
  }

  static styles = [
    onBoardingStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        position: relative;
      }
      ha-icon-button-arrow-prev {
        position: absolute;
        top: 12px;
      }
      ha-card {
        width: 100%;
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: 32px;
      }
      .backup-summary-wrapper {
        margin-top: 24px;
        padding: 0 20px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup": OnboardingRestoreBackup;
  }
}
