import {
  mdiCalendar,
  mdiCog,
  mdiDotsVertical,
  mdiPlus,
  mdiPuzzle,
  mdiUpload,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import {
  fetchBackupConfig,
  fetchBackupInfo,
  generateBackup,
  generateBackupWithStrategySettings,
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
import { showBackupOnboardingDialog } from "./dialogs/show-dialog-backup_onboarding";
import { showGenerateBackupDialog } from "./dialogs/show-dialog-generate-backup";
import { showNewBackupDialog } from "./dialogs/show-dialog-new-backup";
import { showUploadBackupDialog } from "./dialogs/show-dialog-upload-backup";
import { bytesToString } from "../../../util/bytes-to-string";

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
    }
  }

  private async _uploadBackup(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    await showUploadBackupDialog(this, {});
  }

  private _configureBackupStrategy() {
    navigate("/config/backup/strategy");
  }

  private async _setupBackupStrategy() {
    const success = await showBackupOnboardingDialog(this, {
      cloudStatus: this.cloudStatus,
    });
    if (!success) {
      return;
    }

    this._fetchBackupConfig();
    await generateBackupWithStrategySettings(this.hass);
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
      await this._setupBackupStrategy();
    }

    if (!this._config) {
      return;
    }

    const config = this._config;

    const type = await showNewBackupDialog(this, { config });

    if (!type) {
      return;
    }

    if (type === "custom") {
      const params = await showGenerateBackupDialog(this, {});

      if (!params) {
        return;
      }

      await generateBackup(this.hass, params);
      await this._fetchBackupInfo();
      return;
    }
    if (type === "strategy") {
      await generateBackupWithStrategySettings(this.hass);
      await this._fetchBackupInfo();
    }
  }

  private get _needsOnboarding() {
    return !this._config?.create_backup.password;
  }

  private _showAll() {
    navigate("/config/backup/backups");
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
                      heading="Configure backup strategy"
                      description="Have a one-click backup automation with selected data and locations."
                      has-action
                      status="info"
                    >
                      <ha-button
                        slot="action"
                        @click=${this._setupBackupStrategy}
                      >
                        Set up backup strategy
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

          <ha-card class="my-backups">
            <div class="card-header">My backups</div>
            <div class="card-content">
              <ha-md-list>
                <ha-md-list-item type="link" href="/config/backup/backups">
                  <div slot="headline">3 automatic backups</div>
                  <div slot="supporting-text">
                    ${bytesToString(5000000000, 1)} in total
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>
                <ha-md-list-item type="link" href="/config/backup/backups">
                  <div slot="headline">2 manual backups</div>
                  <div slot="supporting-text">
                    ${bytesToString(1000000000, 1)} in total
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>
              </ha-md-list>
            </div>
            <div class="card-actions">
              <ha-button href="/config/backup/backups" @click=${this._showAll}>
                Show all backups
              </ha-button>
            </div>
          </ha-card>

          <ha-card class="my-backups">
            <div class="card-header">Automatic backups</div>
            <div class="card-content">
              <ha-md-list>
                <ha-md-list-item>
                  <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
                  <div slot="headline">
                    Daily at 04:45 and keep the latest 3 copies
                  </div>
                  <div slot="supporting-text">
                    Schedule and number of backups to keep
                  </div>
                </ha-md-list-item>
                <ha-md-list-item>
                  <ha-svg-icon slot="start" .path=${mdiCog}></ha-svg-icon>
                  <div slot="headline">Settings and history</div>
                  <div slot="supporting-text">
                    Home Assistant data that is included
                  </div>
                </ha-md-list-item>
                <ha-md-list-item>
                  <ha-svg-icon slot="start" .path=${mdiPuzzle}></ha-svg-icon>
                  <div slot="headline">All 4 add-ons, including new</div>
                  <div slot="supporting-text">Add-ons that are included</div>
                </ha-md-list-item>
                <ha-md-list-item>
                  <ha-svg-icon slot="start" .path=${mdiUpload}></ha-svg-icon>
                  <div slot="headline">Upload to 2 off-site locations</div>
                  <div slot="supporting-text">
                    Locations where backup is uploaded to
                  </div>
                </ha-md-list-item>
              </ha-md-list>
            </div>
            <div class="card-actions">
              <ha-button
                href="/config/backup/strategy"
                @click=${this._configureBackupStrategy}
              >
                Configure automatic backups
              </ha-button>
            </div>
          </ha-card>
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
