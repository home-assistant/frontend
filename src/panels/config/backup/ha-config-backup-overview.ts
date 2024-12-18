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
import { DEFAULT_MANAGER_STATE } from "../../../data/backup_manager";
import type { CloudStatus } from "../../../data/cloud";
import "../../../layouts/hass-subpage";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import "./components/ha-backup-summary-card";
import "./components/ha-backup-summary-progress";
import "./components/ha-backup-summary-status";
import "./components/overview/ha-backup-overview-backups";
import "./components/overview/ha-backup-overview-settings";
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

  @state() private _manager: ManagerStateEvent = DEFAULT_MANAGER_STATE;

  @state() private _backups: BackupContent[] = [];

  @state() private _fetching = false;

  @state() private _config?: BackupConfig;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._fetchBackupInfo();
    this._fetchBackupConfig();
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

  private async _setupAutomaticBackup() {
    const success = await showBackupOnboardingDialog(this, {
      cloudStatus: this.cloudStatus,
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
      await this._setupAutomaticBackup();
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
      "state" in this._manager && this._manager.state === "in_progress";

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
          ${this._fetching
            ? html`
                <ha-backup-summary-card
                  heading="Loading backups"
                  description="Your backup information is being retrieved."
                  status="loading"
                >
                </ha-backup-summary-card>
              `
            : backupInProgress
              ? html`
                  <ha-backup-summary-progress
                    .hass=${this.hass}
                    .manager=${this._manager}
                  >
                  </ha-backup-summary-progress>
                `
              : this._needsOnboarding
                ? html`
                    <ha-backup-summary-card
                      heading="Configure automatic backups"
                      description="Have a one-click backup automation with selected data and locations."
                      has-action
                      status="info"
                    >
                      <ha-button
                        slot="action"
                        @click=${this._setupAutomaticBackup}
                      >
                        Set up automatic backups
                      </ha-button>
                    </ha-backup-summary-card>
                  `
                : html`
                    <ha-backup-summary-status
                      .hass=${this.hass}
                      .backups=${this._backups}
                    >
                    </ha-backup-summary-status>
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-overview": HaConfigBackupOverview;
  }
}
