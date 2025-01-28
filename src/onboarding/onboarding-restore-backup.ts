import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "./restore-backup/onboarding-restore-backup-upload";
import "./restore-backup/onboarding-restore-backup-details";
import "./restore-backup/onboarding-restore-backup-restore";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-card";
import "../components/ha-icon-button-arrow-prev";
import "../components/ha-circular-progress";
import "../components/ha-alert";
import "./onboarding-loading";
import { removeSearchParam } from "../common/url/search-params";
import { navigate } from "../common/navigate";
import { onBoardingStyles } from "./styles";
import { fetchBackupOnboardingInfo } from "../data/backup_onboarding";
import type { BackupContentExtended, BackupData } from "../data/backup";
import { showConfirmationDialog } from "../dialogs/generic/show-dialog-box";

const STORAGE_BACKUP_ID_KEY = "onboarding-restore-backup-backup-id";

@customElement("onboarding-restore-backup")
class OnboardingRestoreBackup extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property() public language!: string;

  @property({ type: Boolean }) public supervisor = false;

  @state() private _view: "loading" | "upload" | "details" | "restore" =
    "loading";

  @state() private _backup?: BackupContentExtended;

  @state() private _selectedData?: BackupData;

  @state() private _error?: string;

  @state() private _failed?: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-icon-button-arrow-prev
        .label=${this.localize("ui.panel.page-onboarding.restore.no_backup_found")}
        @click=${this._back}
      ></ha-icon-button-arrow-prev>
      </ha-icon-button>
      <h1>${this.localize("ui.panel.page-onboarding.restore.header")}</h1>
      ${
        this._error
          ? html` <ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      ${
        this._failed
          ? html`<ha-alert
              alert-type="error"
              .title=${this.localize("ui.panel.page-onboarding.restore.failed")}
              >${this.localize(
                "ui.panel.page-onboarding.restore.failed_description"
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
              ?supervisor=${this.supervisor}
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
            ></onboarding-restore-backup-restore>`
          : nothing
      }
      ${
        ["details", "restore"].includes(this._view) && this._backup
          ? html` <ha-backup-details-summary
              show-upload-another
              .backup=${this._backup}
              .localize=${this.localize}
              @show-backup-upload=${this._reupload}
            ></ha-backup-details-summary>`
          : nothing
      }
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    this._loadBackupInfo();
  }

  private async _loadBackupInfo() {
    try {
      const backupInfo = await fetchBackupOnboardingInfo();
      const backupId = localStorage.getItem(STORAGE_BACKUP_ID_KEY);

      const failedRestore =
        backupInfo.last_non_idle_event?.manager_state === "restore_backup" &&
        backupInfo.last_non_idle_event?.state === "failed";

      if (failedRestore) {
        this._failed = true;
      }

      if (!backupInfo.last_non_idle_event || !backupId) {
        this._view = "upload";
        return;
      }

      this._backup = backupInfo.backups.find(
        ({ backup_id }) => backup_id === backupId
      );

      if (
        this._backup &&
        (backupInfo.last_non_idle_event.manager_state === "receive_backup" ||
          failedRestore)
      ) {
        this._view = "details";
        return;
      }

      if (
        this._backup &&
        this._selectedData &&
        backupInfo.last_non_idle_event.manager_state === "restore_backup"
      ) {
        this._view = "restore";
        return;
      }

      // fallback to upload
      this._view = "upload";
    } catch (err: any) {
      this._error = err?.message || "Cannot get backup info";
      this._view = "upload";

      // TODO handle no connection error during restore process
    }
  }

  private async _backupUploaded(ev: CustomEvent) {
    localStorage.setItem(STORAGE_BACKUP_ID_KEY, ev.detail.backupId);
    await this._loadBackupInfo();
  }

  private _back() {
    if (this._view === "upload") {
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
      ha-backup-details-summary {
        margin: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup": OnboardingRestoreBackup;
  }
}
