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
import "../components/ha-spinner";
import "../components/ha-alert";
import "./onboarding-loading";
import { removeSearchParam } from "../common/url/search-params";
import { navigate } from "../common/navigate";
import { onBoardingStyles } from "./styles";
import {
  fetchBackupOnboardingInfo,
  type BackupOnboardingConfig,
  type BackupOnboardingInfo,
} from "../data/backup_onboarding";
import type { BackupContentExtended, BackupData } from "../data/backup";
import { showConfirmationDialog } from "../dialogs/generic/show-dialog-box";
import { storage } from "../common/decorators/storage";

const STATUS_INTERVAL_IN_MS = 5000;

@customElement("onboarding-restore-backup")
class OnboardingRestoreBackup extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property() public language!: string;

  @property({ type: Boolean }) public supervisor = false;

  @state() private _view:
    | "loading"
    | "upload"
    | "select_data"
    | "confirm_restore"
    | "status" = "loading";

  @state() private _backup?: BackupContentExtended;

  @state() private _backupInfo?: BackupOnboardingInfo;

  @state() private _selectedData?: BackupData;

  @state() private _error?: string;

  @state() private _failed?: boolean;

  @storage({
    key: "onboarding-restore-backup-backup-id",
  })
  private _backupId?: string;

  @storage({
    key: "onboarding-restore-running",
  })
  private _restoreRunning?: boolean;

  protected render(): TemplateResult {
    return html`
      ${
        this._view !== "status" || this._failed
          ? html`<ha-icon-button-arrow-prev
              .label=${this.localize("ui.panel.page-onboarding.restore.back")}
              @click=${this._back}
            ></ha-icon-button-arrow-prev>`
          : nothing
      }
      </ha-icon-button>
      <h1>${this.localize("ui.panel.page-onboarding.restore.header")}</h1>
      ${
        this._error || (this._failed && this._view !== "status")
          ? html`<ha-alert
              alert-type="error"
              .title=${this._failed && this._view !== "status"
                ? this.localize("ui.panel.page-onboarding.restore.failed")
                : ""}
            >
              ${this._failed && this._view !== "status"
                ? this.localize(
                    `ui.panel.page-onboarding.restore.${this._backupInfo?.last_non_idle_event?.reason === "password_incorrect" ? "failed_wrong_password_description" : "failed_description"}`
                  )
                : this._error}
            </ha-alert>`
          : nothing
      }
      ${
        this._view === "loading"
          ? html`<div class="loading">
              <ha-spinner></ha-spinner>
            </div>`
          : this._view === "upload"
            ? html`
                <onboarding-restore-backup-upload
                  .supervisor=${this.supervisor}
                  .localize=${this.localize}
                  @backup-uploaded=${this._backupUploaded}
                ></onboarding-restore-backup-upload>
              `
            : this._view === "select_data"
              ? html`<onboarding-restore-backup-details
                  .localize=${this.localize}
                  .backup=${this._backup!}
                  @backup-restore=${this._restore}
                ></onboarding-restore-backup-details>`
              : this._view === "confirm_restore"
                ? html`<onboarding-restore-backup-restore
                    .localize=${this.localize}
                    .backup=${this._backup!}
                    .supervisor=${this.supervisor}
                    .selectedData=${this._selectedData!}
                    @restore-started=${this._restoreStarted}
                  ></onboarding-restore-backup-restore>`
                : nothing
      }
      ${
        this._view === "status" && this._backupInfo
          ? html`<onboarding-restore-backup-status
              .localize=${this.localize}
              .backupInfo=${this._backupInfo}
              @show-backup-upload=${this._reupload}
            ></onboarding-restore-backup-status>`
          : nothing
      }
      ${
        ["select_data", "confirm_restore"].includes(this._view) && this._backup
          ? html`<div class="backup-summary-wrapper">
              <ha-backup-details-summary
                translation-key-panel="page-onboarding.restore"
                show-upload-another
                .backup=${this._backup}
                .localize=${this.localize}
                @show-backup-upload=${this._reupload}
                .isHassio=${this.supervisor}
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
    let onboardingInfo: BackupOnboardingConfig;
    try {
      onboardingInfo = await fetchBackupOnboardingInfo();
    } catch (err: any) {
      if (this._restoreRunning) {
        if (
          err.error === "Request error" ||
          // core can restart but haven't loaded the backup integration yet
          (err.status_code === 500 && err.body?.error === "backup_disabled")
        ) {
          // core is down because of restore, keep trying
          this._scheduleLoadBackupInfo();
          return;
        }

        // core seems to be back up restored
        if (err.status_code === 404) {
          this._restoreRunning = undefined;
          this._backupId = undefined;
          window.location.replace("/");
          return;
        }
      }

      this._error = err?.message || "Cannot get backup info";

      // if we are in an unknown state, show upload
      if (this._view === "loading") {
        this._view = "upload";
      }
      return;
    }

    const {
      last_non_idle_event: lastNonIdleEvent,
      state: currentState,
      backups,
    } = onboardingInfo;

    this._backupInfo = {
      state: currentState,
      last_non_idle_event: lastNonIdleEvent,
    };

    if (this._backupId) {
      this._backup = backups.find(
        ({ backup_id }) => backup_id === this._backupId
      );
    }

    const failedRestore =
      lastNonIdleEvent?.manager_state === "restore_backup" &&
      lastNonIdleEvent?.state === "failed";

    if (failedRestore) {
      this._failed = true;
    }

    if (this._restoreRunning) {
      this._view = "status";
      if (failedRestore || currentState !== "restore_backup") {
        this._failed = true;
        this._restoreRunning = undefined;
      } else {
        this._scheduleLoadBackupInfo();
      }
      return;
    }

    if (
      this._backup &&
      // after backup was uploaded
      (lastNonIdleEvent?.manager_state === "receive_backup" ||
        // when restore was confirmed but failed to start (for example, encryption key was wrong)
        failedRestore)
    ) {
      if (!this.supervisor && this._backup.homeassistant_included) {
        this._selectedData = {
          homeassistant_included: true,
          folders: [],
          addons: [],
          homeassistant_version: this._backup.homeassistant_version,
          database_included: this._backup.database_included,
        };
        // skip select data when supervisor is not available and backup includes HA
        this._view = "confirm_restore";
      } else {
        this._view = "select_data";
      }
      return;
    }

    // show upload as default
    this._view = "upload";
  }

  private _scheduleLoadBackupInfo() {
    setTimeout(() => this._loadBackupInfo(), STATUS_INTERVAL_IN_MS);
  }

  private async _backupUploaded(ev: CustomEvent) {
    this._backupId = ev.detail.backupId;
    await this._loadBackupInfo();
  }

  private async _restoreStarted() {
    if (this._backupInfo) {
      this._backupInfo.state = "restore_backup";
    }
    this._view = "status";
    this._restoreRunning = true;
    await this._loadBackupInfo();
  }

  private async _back() {
    if (this._view === "upload" || (this._view === "status" && this._failed)) {
      navigate(`${location.pathname}?${removeSearchParam("page")}`);
    } else {
      const confirmed = await showConfirmationDialog(this, {
        title: this.localize(
          "ui.panel.page-onboarding.restore.cancel_restore.title"
        ),
        text: this.localize(
          "ui.panel.page-onboarding.restore.cancel_restore.text"
        ),
        confirmText: this.localize(
          "ui.panel.page-onboarding.restore.cancel_restore.yes"
        ),
        dismissText: this.localize(
          "ui.panel.page-onboarding.restore.cancel_restore.no"
        ),
      });

      if (!confirmed) {
        return;
      }
      navigate(`${location.pathname}?${removeSearchParam("page")}`);
    }
  }

  private _restore(ev: CustomEvent) {
    if (!this._backup || !ev.detail.selectedData) {
      return;
    }
    this._selectedData = ev.detail.selectedData;

    this._view = "confirm_restore";
  }

  private _reupload() {
    this._backup = undefined;
    this._backupId = undefined;
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
