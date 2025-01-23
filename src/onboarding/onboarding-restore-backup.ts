import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "./restore-backup/onboarding-restore-backup-upload";
import "./restore-backup/onboarding-restore-backup-details";
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
import type { BackupContentExtended } from "../data/backup";

@customElement("onboarding-restore-backup")
class OnboardingRestoreBackup extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property() public language!: string;

  @property({ type: Boolean }) public supervisor = false;

  @state() private _view: "loading" | "upload" | "details" | "restore" =
    "loading";

  @state() private _backup?: BackupContentExtended;

  @state() private _error?: string;

  protected render(): TemplateResult {
    return html`
      <ha-icon-button-arrow-prev
        .label=${this.localize("ui.panel.page-onboarding.restore.no_backup_found")}
        @click=${this._back}
        .disabled=${this._view === "restore"}
      ></ha-icon-button-arrow-prev>
      </ha-icon-button>
      <h1>${this.localize("ui.panel.page-onboarding.restore.header")}</h1>
      ${
        this._error
          ? html` <ha-alert alert-type="error">${this._error}</ha-alert>`
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
            ></onboarding-restore-backup-details>`
          : nothing
      }
      ${this._view === "restore" ? html`<div>Restore in progress</div>` : nothing}
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    this._loadBackupInfo();
  }

  private async _loadBackupInfo() {
    try {
      const backupInfo = await fetchBackupOnboardingInfo();

      if (!backupInfo.last_non_idle_event) {
        this._view = "upload";
        return;
      }

      if (
        backupInfo.last_non_idle_event.manager_state === "receive_backup" &&
        backupInfo.backups.length > 0
      ) {
        this._backup = backupInfo.backups[0];
        this._view = "details";
        return;
      }

      if (backupInfo.last_non_idle_event.manager_state === "restore_backup") {
        this._view = "restore";
      }
    } catch (err: any) {
      this._error = err?.message || "Cannot get backup info";
      this._view = "upload";

      // TODO handle no connection error during restore process
    }
  }

  private async _backupUploaded() {
    await this._loadBackupInfo();
  }

  private _back(): void {
    navigate(`${location.pathname}?${removeSearchParam("page")}`);
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup": OnboardingRestoreBackup;
  }
}
