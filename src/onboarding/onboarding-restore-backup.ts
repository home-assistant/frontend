import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "./restore-backup/onboarding-restore-backup-restore";
import "./restore-backup/onboarding-restore-backup-status";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-icon-button-arrow-prev";
import "../components/ha-circular-progress";
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
import { CLOUD_AGENT, type BackupContentExtended } from "../data/backup";
import { storage } from "../common/decorators/storage";
import { fetchHaCloudStatus, signOutHaCloud } from "../data/onboarding";
import type { CloudStatus } from "../data/cloud";
import { showToast } from "../util/toast";

const STATUS_INTERVAL_IN_MS = 5000;

@customElement("onboarding-restore-backup")
class OnboardingRestoreBackup extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ type: Boolean }) public supervisor = false;

  @property() public mode!: "upload" | "cloud";

  @state() private _view:
    | "loading"
    | "upload"
    | "cloud_login"
    | "empty_cloud"
    | "restore"
    | "status" = "loading";

  @state() private _backup?: BackupContentExtended;

  @state() private _backupInfo?: BackupOnboardingInfo;

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
      ${this._view === "loading"
        ? html`<div class="loading">
            <ha-circular-progress indeterminate></ha-circular-progress>
          </div>`
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
                  @ha-refresh-cloud-status=${this._showCloudBackup}
                ></onboarding-restore-backup-cloud-login>
              `
            : this._view === "empty_cloud"
              ? html`
                  <onboarding-restore-backup-empty-cloud
                    .localize=${this.localize}
                    @sign-out=${this._signOut}
                  ></onboarding-restore-backup-empty-cloud>
                `
              : this._view === "restore"
                ? html`<onboarding-restore-backup-restore
                    .mode=${this.mode}
                    .localize=${this.localize}
                    .backup=${this._backup!}
                    .supervisor=${this.supervisor}
                    .error=${this._failed
                      ? this.localize(
                          `ui.panel.page-onboarding.restore.${this._backupInfo?.last_non_idle_event?.reason === "password_incorrect" ? "failed_wrong_password_description" : "failed_description"}`
                        )
                      : this._error}
                    @restore-started=${this._restoreStarted}
                    @restore-backup-back=${this._back}
                    @sign-out=${this._signOut}
                  ></onboarding-restore-backup-restore>`
                : nothing}
      ${this._view === "status" && this._backupInfo
        ? html`<onboarding-restore-backup-status
            .localize=${this.localize}
            .backupInfo=${this._backupInfo}
            @restore-backup-back=${this._back}
          ></onboarding-restore-backup-status>`
        : nothing}
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (this.mode === "cloud") {
      import("./restore-backup/onboarding-restore-backup-cloud-login");
      import("./restore-backup/onboarding-restore-backup-empty-cloud");
    } else {
      import("./restore-backup/onboarding-restore-backup-upload");
    }

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
      !this._backupId &&
      this.mode === "cloud"
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
      this._view = "restore";
      return;
    }

    // show default view
    if (this.mode === "upload") {
      this._view = "upload";
    } else if (this._cloudStatus?.logged_in) {
      this._view = "empty_cloud";
    } else {
      this._view = "cloud_login";
    }
  }

  private _showCloudBackup() {
    this._view = "loading";
    this._loadBackupInfo();
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

  private async _signOut() {
    this._view = "loading";

    showToast(this, {
      id: "sign-out-ha-cloud",
      message: this.localize(
        "ui.panel.page-onboarding.restore.ha-cloud.sign_out_progress"
      ),
    });
    this._backupId = undefined;
    this._cloudStatus = undefined;
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

    navigate(`${location.pathname}?${removeSearchParam("page")}`);
  }

  private async _back() {
    this._view = "loading";
    this._backup = undefined;
    this._backupId = undefined;
    if (this.mode === "upload") {
      this._view = "upload";
    } else {
      navigate(`${location.pathname}?${removeSearchParam("page")}`);
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
      .loading {
        display: flex;
        justify-content: center;
        padding: 32px;
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
