import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "./restore-backup/onboarding-restore-backup-upload";
import "./restore-backup/onboarding-restore-backup-details";
import "./restore-backup/onboarding-restore-backup-restore";
import "./restore-backup/onboarding-restore-backup-status";
import "./restore-backup/onboarding-restore-backup-options";
import "./restore-backup/onboarding-restore-backup-cloud-login";
import "./restore-backup/onboarding-restore-backup-empty-cloud";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-card";
import "../components/ha-icon-button-arrow-prev";
import "../components/ha-circular-progress";
import "../components/ha-alert";
import "../components/ha-button";
import "./onboarding-loading";
import { removeSearchParam } from "../common/url/search-params";
import { navigate } from "../common/navigate";
import { onBoardingStyles } from "./styles";
import {
  fetchBackupOnboardingInfo,
  type BackupOnboardingConfig,
  type BackupOnboardingInfo,
} from "../data/backup_onboarding";
import {
  CLOUD_AGENT,
  type BackupContentExtended,
  type BackupData,
} from "../data/backup";
import { showConfirmationDialog } from "../dialogs/generic/show-dialog-box";
import { storage } from "../common/decorators/storage";
import { fetchHaCloudStatus, signOutHaCloud } from "../data/onboarding";
import type { CloudStatus } from "../data/cloud";
import { showToast } from "../util/toast";

const STATUS_INTERVAL_IN_MS = 5000;

const HOME_ASSISTANT_CLOUD_PLACEHOLDER_ID = "HOME_ASSISTANT_CLOUD";

@customElement("onboarding-restore-backup")
class OnboardingRestoreBackup extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ type: Boolean }) public supervisor = false;

  @state() private _view:
    | "loading"
    | "options"
    | "upload"
    | "cloud_login"
    | "empty_cloud"
    | "select_data"
    | "confirm_restore"
    | "status" = "loading";

  @state() private _backup?: BackupContentExtended;

  @state() private _backupInfo?: BackupOnboardingInfo;

  @state() private _selectedData?: BackupData;

  @state() private _error?: string;

  @state() private _failed?: boolean;

  @state() private _cloudStatus?: CloudStatus;

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
              <ha-circular-progress indeterminate></ha-circular-progress>
            </div>`
          : this._view === "options"
            ? html`<onboarding-restore-backup-options
                .localize=${this.localize}
                @upload-option-selected=${this._showSelectedView}
              ></onboarding-restore-backup-options>`
            : this._view === "upload"
              ? html`
                  <onboarding-restore-backup-upload
                    .supervisor=${this.supervisor}
                    .localize=${this.localize}
                    @backup-uploaded=${this._backupUploaded}
                  ></onboarding-restore-backup-upload>
                `
              : this._view === "cloud_login"
                ? html`
                    <onboarding-restore-backup-cloud-login
                      .localize=${this.localize}
                      @backup-uploaded=${this._backupUploaded}
                      @ha-refresh-cloud-status=${this._showCloudBackup}
                    ></onboarding-restore-backup-cloud-login>
                  `
                : this._view === "empty_cloud"
                  ? html`
                      <onboarding-restore-backup-empty-cloud
                        .localize=${this.localize}
                        @upload-option-selected=${this._showSelectedView}
                        @sign-out=${this._signOutHaCloud}
                      ></onboarding-restore-backup-empty-cloud>
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
              <ha-alert title="Home Assistant Cloud">
                ${this.localize(
                  "ui.panel.page-onboarding.restore.ha-cloud.stored_in_cloud_description"
                )}
                <ha-button class="logout" slot="action" destructive @click=${this._signOutHaCloud}>
                  ${this.localize("ui.panel.page-onboarding.restore.ha-cloud.sign_out")}
                </ha-button>
              </ha-alert>
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

    try {
      this._cloudStatus = await fetchHaCloudStatus();
    } catch (err: any) {
      this._error = err?.message || "Cannot get Home Assistant Cloud status";
    }

    if (
      this._cloudStatus?.logged_in &&
      this._backupId === HOME_ASSISTANT_CLOUD_PLACEHOLDER_ID
    ) {
      this._backup = backups.find(({ agents }) =>
        Object.keys(agents).includes(CLOUD_AGENT)
      );

      if (!this._backup) {
        this._view = "empty_cloud";
        return;
      }
      this._backupId = this._backup?.backup_id;
    } else if (this._backupId) {
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

    if (this._backup) {
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
    this._view = "options";
  }

  private _showCloudBackup() {
    this._view = "loading";
    this._loadBackupInfo()
  }

  private async _showSelectedView(ev: CustomEvent) {
    if (ev.detail === "upload") {
      this._view = "upload";
    } else if (this._cloudStatus?.logged_in) {
      // When HA cloud is logged in, cloud backup agent is available
      // If it won't be available, the login should have failed
      this._backupId = HOME_ASSISTANT_CLOUD_PLACEHOLDER_ID;
      this._loadBackupInfo();
    } else {
      this._view = "cloud_login";
    }
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
    if (this._view === "options" || (this._view === "status" && this._failed)) {
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

      this._backupId = undefined;
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
    this._view = "options";
  }

  private async _signOutHaCloud() {
    showToast(this, {
      id: "sign-out-ha-cloud",
      message: this.localize(
        "ui.panel.page-onboarding.restore.ha-cloud.sign_out_progress"
      ),
    });
    this._backupId = undefined;
    this._cloudStatus = undefined;
    this._view = "options";
    try {
      await signOutHaCloud();
      showToast(this, {
        id: "sign-out-ha-cloud",
        message: this.localize(
          "ui.panel.page-onboarding.restore.ha-cloud.sign_out_success"
        ),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      showToast(this, {
        id: "sign-out-ha-cloud",
        message: this.localize(
          "ui.panel.page-onboarding.restore.ha-cloud.sign_out_error"
        ),
      });
    }
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
      ha-alert {
        display: block;
        margin-bottom: 8px;
      }
      .logout {
        white-space: nowrap;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup": OnboardingRestoreBackup;
  }
}
