import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { storage } from "../common/decorators/storage";
import { navigate } from "../common/navigate";
import type { LocalizeFunc } from "../common/translations/localize";
import { removeSearchParam } from "../common/url/search-params";
import { CLOUD_AGENT, type BackupContentExtended } from "../data/backup";
import {
  fetchBackupOnboardingInfo,
  type BackupOnboardingConfig,
  type BackupOnboardingInfo,
} from "../data/backup_onboarding";
import type { CloudStatus } from "../data/cloud";
import {
  fetchHaCloudStatus,
  signOutHaCloud,
  waitForIntegration,
} from "../data/onboarding";
import { showToast } from "../util/toast";
import "./onboarding-loading";
import "./restore-backup/onboarding-restore-backup-restore";
import "./restore-backup/onboarding-restore-backup-status";
import { onBoardingStyles } from "./styles";

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

  private _loadedIntegrations = new Set<string>();

  protected render(): TemplateResult {
    return html`
      ${this._error && this._view !== "restore"
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : nothing}
      ${this._view === "loading"
        ? html`<onboarding-loading></onboarding-loading>`
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
                  <onboarding-restore-backup-no-cloud-backup
                    .localize=${this.localize}
                    @sign-out=${this._signOut}
                  ></onboarding-restore-backup-no-cloud-backup>
                `
              : this._view === "restore"
                ? html`<onboarding-restore-backup-restore
                    .mode=${this.mode}
                    .localize=${this.localize}
                    .backup=${this._backup!}
                    .supervisor=${this.supervisor}
                    .error=${this._failed
                      ? this.localize(
                          `ui.panel.page-onboarding.restore.${this._backupInfo?.last_action_event?.reason === "password_incorrect" ? "failed_wrong_password_description" : "failed_description"}`
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
      import("./restore-backup/onboarding-restore-backup-no-cloud-backup");
    } else {
      import("./restore-backup/onboarding-restore-backup-upload");
    }

    this._loadBackupInfo();
  }

  private async _loadBackupInfo() {
    let onboardingInfo: BackupOnboardingConfig;
    if (this._restoreRunning || !this._loadedIntegrations.has("backup")) {
      try {
        if ((await waitForIntegration("backup")).integration_loaded) {
          this._loadedIntegrations.add("backup");
        } else {
          this._error = "Backup integration not loaded";
          return;
        }
      } catch (err: any) {
        // core seems to be back up restored
        if (err.status_code === 404) {
          this._resetAndReload();
          return;
        }

        this._scheduleLoadBackupInfo(1000);
        return;
      }
    }
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
          this._resetAndReload();
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
      last_action_event: lastActionEvent,
      state: currentState,
      backups,
    } = onboardingInfo;

    this._backupInfo = {
      state: currentState,
      last_action_event: lastActionEvent,
    };

    if (this.mode === "cloud") {
      try {
        if (!this._loadedIntegrations.has("cloud")) {
          if ((await waitForIntegration("cloud")).integration_loaded) {
            this._loadedIntegrations.add("cloud");
          } else {
            this._error = "Cloud integration not loaded";
            return;
          }
        }
        this._cloudStatus = await fetchHaCloudStatus();
      } catch (err: any) {
        this._error = err?.message || "Cannot get Home Assistant Cloud status";
      }

      if (this._cloudStatus?.logged_in && !this._backupId) {
        this._backup = backups.find(({ agents }) =>
          Object.keys(agents).includes(CLOUD_AGENT)
        );

        if (!this._backup) {
          this._view = "empty_cloud";
          return;
        }
        this._backupId = this._backup?.backup_id;
      }
    } else if (this._backupId) {
      this._backup = backups.find(
        ({ backup_id }) => backup_id === this._backupId
      );
    }

    const failedRestore =
      lastActionEvent?.manager_state === "restore_backup" &&
      lastActionEvent?.state === "failed";

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

  private _resetAndReload() {
    this._restoreRunning = undefined;
    this._backupId = undefined;
    window.location.replace("/");
  }

  private _showCloudBackup() {
    this._view = "loading";
    this._loadBackupInfo();
  }

  private _scheduleLoadBackupInfo(delay: number = STATUS_INTERVAL_IN_MS) {
    setTimeout(() => this._loadBackupInfo(), delay);
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
