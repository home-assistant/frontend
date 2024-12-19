import { mdiDotsVertical, mdiPlus, mdiUpload } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import {
  fetchBackupConfig,
  fetchBackupInfo,
  generateBackup,
  generateBackupWithAutomaticSettings,
  type BackupConfig,
  type BackupContent,
} from "../../../data/backup";
import type { ManagerStateEvent } from "../../../data/backup_manager";
import type { CloudStatus } from "../../../data/cloud";
import "../../../layouts/hass-subpage";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import "./components/ha-backup-summary-card";
import "./components/ha-backup-summary-status";
import "./components/overview/ha-backup-overview-backups";
import "./components/overview/ha-backup-overview-onboarding";
import "./components/overview/ha-backup-overview-progress";
import "./components/overview/ha-backup-overview-settings";
import "./components/overview/ha-backup-overview-summary";
import { showBackupOnboardingDialog } from "./dialogs/show-dialog-backup_onboarding";
import { showGenerateBackupDialog } from "./dialogs/show-dialog-generate-backup";
import { showNewBackupDialog } from "./dialogs/show-dialog-new-backup";
import { showUploadBackupDialog } from "./dialogs/show-dialog-upload-backup";

@customElement("ha-config-backup-overview")
class HaConfigBackupOverview extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus!: CloudStatus;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public manager!: ManagerStateEvent;

  @state() private _backups: BackupContent[] = [];

  @state() private _fetching = false;

  @state() private _config?: BackupConfig;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._fetching = true;
    Promise.all([this._fetchBackupInfo(), this._fetchBackupConfig()]).finally(
      () => {
        this._fetching = false;
      }
    );
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._fetchBackupInfo();
      this._fetchBackupConfig();
    }
  }

  private async _uploadBackup(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    await showUploadBackupDialog(this, {});
  }

  private _handleOnboardingButtonClick(ev) {
    ev.stopPropagation();
    this._setupAutomaticBackup(false);
  }

  private async _setupAutomaticBackup(showIntro: boolean) {
    const success = await showBackupOnboardingDialog(this, {
      cloudStatus: this.cloudStatus,
      showIntro: showIntro,
    });
    if (!success) {
      return;
    }

    this._fetchBackupConfig();
    await generateBackupWithAutomaticSettings(this.hass);
    await this._fetchBackupInfo();
  }

  private async _fetchBackupInfo() {
    const info = await fetchBackupInfo(this.hass);
    this._backups = info.backups;
  }

  private async _fetchBackupConfig() {
    const { config } = await fetchBackupConfig(this.hass);
    this._config = config;
  }

  private async _newBackup(): Promise<void> {
    if (this._needsOnboarding) {
      this._setupAutomaticBackup(true);
      return;
    }

    if (!this._config) {
      return;
    }

    const config = this._config;

    const type = await showNewBackupDialog(this, { config });

    if (!type) {
      return;
    }

    if (type === "manual") {
      const params = await showGenerateBackupDialog(this, {});

      if (!params) {
        return;
      }

      await generateBackup(this.hass, params);
      await this._fetchBackupInfo();
      return;
    }
    if (type === "automatic") {
      await generateBackupWithAutomaticSettings(this.hass);
      await this._fetchBackupInfo();
    }
  }

  private get _needsOnboarding() {
    return !this._config?.create_backup.password;
  }

  protected render(): TemplateResult {
    const backupInProgress =
      "state" in this.manager && this.manager.state === "in_progress";

    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${"Backup"}
      >
        <div slot="toolbar-icon">
          <ha-button-menu>
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-list-item
              graphic="icon"
              @request-selected=${this._uploadBackup}
            >
              <ha-svg-icon slot="graphic" .path=${mdiUpload}></ha-svg-icon>
              Upload backup
            </ha-list-item>
          </ha-button-menu>
        </div>
        <div class="content">
          ${backupInProgress
            ? html`
                <ha-backup-overview-progress
                  .hass=${this.hass}
                  .manager=${this.manager}
                >
                </ha-backup-overview-progress>
              `
            : this._fetching
              ? html`
                  <ha-backup-summary-card
                    heading="Loading backups"
                    description="Your backup information is being retrieved."
                    status="loading"
                  >
                  </ha-backup-summary-card>
                `
              : this._needsOnboarding
                ? html`
                    <ha-backup-overview-onboarding
                      .hass=${this.hass}
                      @button-click=${this._handleOnboardingButtonClick}
                    >
                    </ha-backup-overview-onboarding>
                  `
                : html`
                    <ha-backup-overview-summary
                      .hass=${this.hass}
                      .backups=${this._backups}
                      .config=${this._config}
                    >
                    </ha-backup-overview-summary>
                  `}

          <ha-backup-overview-backups
            .hass=${this.hass}
            .backups=${this._backups}
          ></ha-backup-overview-backups>

          ${!this._needsOnboarding
            ? html`
                <ha-backup-overview-settings
                  .hass=${this.hass}
                  .config=${this._config!}
                ></ha-backup-overview-settings>
              `
            : nothing}
        </div>

        <ha-fab
          slot="fab"
          ?disabled=${backupInProgress}
          .label=${"Backup now"}
          extended
          @click=${this._newBackup}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-subpage>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding: 28px 20px 0;
          max-width: 690px;
          margin: 0 auto;
          gap: 24px;
          display: flex;
          flex-direction: column;
          margin-bottom: 24px;
          margin-bottom: 72px;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
        .card-content {
          padding-left: 0;
          padding-right: 0;
        }
        ha-fab[disabled] {
          --mdc-theme-secondary: var(--disabled-text-color) !important;
          pointer-events: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-overview": HaConfigBackupOverview;
  }
}
