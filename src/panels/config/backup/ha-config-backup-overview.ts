import { mdiDotsVertical, mdiPlus, mdiUpload } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-spinner";
import "../../../components/ha-svg-icon";
import type {
  BackupAgent,
  BackupConfig,
  BackupContent,
  BackupInfo,
} from "../../../data/backup";
import {
  computeBackupAgentName,
  generateBackup,
  generateBackupWithAutomaticSettings,
  saveBackupConfig,
} from "../../../data/backup";
import type { ManagerStateEvent } from "../../../data/backup_manager";
import type { CloudStatus } from "../../../data/cloud";
import "../../../layouts/hass-subpage";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { showAlertDialog } from "../../lovelace/custom-card-helpers";
import "./components/overview/ha-backup-overview-backups";
import "./components/overview/ha-backup-overview-app-update-backup";
import "./components/overview/ha-backup-overview-onboarding";
import "./components/overview/ha-backup-overview-progress";
import "./components/overview/ha-backup-overview-settings";
import "./components/overview/ha-backup-overview-summary";
import "./components/config/ha-backup-config-encryption-key";
import { showBackupOnboardingDialog } from "./dialogs/show-dialog-backup_onboarding";
import { showGenerateBackupDialog } from "./dialogs/show-dialog-generate-backup";
import { showNewBackupDialog } from "./dialogs/show-dialog-new-backup";
import { showUploadBackupDialog } from "./dialogs/show-dialog-upload-backup";

@customElement("ha-config-backup-overview")
class HaConfigBackupOverview extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public manager!: ManagerStateEvent;

  @property({ attribute: false }) public info?: BackupInfo;

  @property({ attribute: false }) public backups: BackupContent[] = [];

  @property({ attribute: false }) public fetching = false;

  @property({ attribute: false }) public config?: BackupConfig;

  @property({ attribute: false }) public agents: BackupAgent[] = [];

  @property({ attribute: false }) public uploadProgress: Record<
    string,
    { uploaded_bytes: number; total_bytes: number }
  > = {};

  private _uploadBackup = async () => {
    await showUploadBackupDialog(this, {});
  };

  private _encryptionKeyChanged(ev) {
    if (!this.config) {
      return;
    }

    const password = ev.detail.value as string;
    this.config = {
      ...this.config,
      create_backup: {
        ...this.config.create_backup,
        password,
      },
    };

    this._debounceSaveConfig();
  }

  private _debounceSaveConfig = debounce(() => this._saveConfig(), 500);

  private async _saveConfig() {
    if (!this.config) {
      return;
    }

    await saveBackupConfig(this.hass, this.config);

    fireEvent(this, "ha-refresh-backup-config");
  }

  private _handleOnboardingButtonClick(ev) {
    ev.stopPropagation();
    this._setupAutomaticBackup(true);
  }

  private async _setupAutomaticBackup(skipWelcome = false) {
    const success = await showBackupOnboardingDialog(this, {
      config: this.config!,
      cloudStatus: this.cloudStatus,
      skipWelcome,
    });
    if (!success) {
      return;
    }

    fireEvent(this, "ha-refresh-backup-config");
    try {
      await generateBackupWithAutomaticSettings(this.hass);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.backup.overview.create_backup_failed"
        ),
        text: err.message,
      });
      return;
    }
    fireEvent(this, "ha-refresh-backup-info");
  }

  private async _newBackup(): Promise<void> {
    if (this._needsOnboarding) {
      this._setupAutomaticBackup();
      return;
    }

    if (!this.config) {
      return;
    }

    const config = this.config;

    const type = await showNewBackupDialog(this, { config });

    if (!type) {
      return;
    }

    try {
      if (type === "manual") {
        const params = await showGenerateBackupDialog(this, {
          cloudStatus: this.cloudStatus,
        });

        if (!params) {
          return;
        }

        await generateBackup(this.hass, params);
      } else if (type === "automatic") {
        await generateBackupWithAutomaticSettings(this.hass);
      }
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.backup.overview.create_backup_failed"
        ),
        text: err.message,
      });
      return;
    }
    fireEvent(this, "ha-refresh-backup-info");
  }

  private get _needsOnboarding() {
    return this.config && !this.config.automatic_backups_configured;
  }

  protected render(): TemplateResult {
    const backupInProgress =
      "state" in this.manager && this.manager.state === "in_progress";

    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.backup.overview.header")}
      >
        <ha-dropdown
          slot="toolbar-icon"
          placement="bottom-end"
          @wa-select=${this._handleDropdownSelect}
        >
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-dropdown-item value="upload_backup">
            <ha-svg-icon slot="icon" .path=${mdiUpload}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.backup.overview.menu.upload_backup"
            )}
          </ha-dropdown-item>
        </ha-dropdown>
        <div class="content">
          ${this.info && Object.keys(this.info.agent_errors).length
            ? html`${Object.entries(this.info.agent_errors).map(
                ([agentId, error]) =>
                  html`<ha-alert
                    alert-type="error"
                    .title=${this.hass.localize(
                      "ui.panel.config.backup.overview.agent_error",
                      {
                        name: computeBackupAgentName(
                          this.hass.localize,
                          agentId,
                          this.agents
                        ),
                      }
                    )}
                  >
                    ${error}
                  </ha-alert>`
              )}`
            : nothing}
          ${backupInProgress
            ? html`
                <ha-backup-overview-progress
                  .hass=${this.hass}
                  .manager=${this.manager}
                  .agents=${this.agents}
                  .uploadProgress=${this.uploadProgress}
                >
                </ha-backup-overview-progress>
              `
            : this._needsOnboarding
              ? html`
                  <ha-backup-overview-onboarding
                    .hass=${this.hass}
                    @button-click=${this._handleOnboardingButtonClick}
                  >
                  </ha-backup-overview-onboarding>
                `
              : this.config
                ? html`
                    <ha-backup-overview-summary
                      .hass=${this.hass}
                      .backups=${this.backups}
                      .config=${this.config}
                      .fetching=${this.fetching}
                    >
                    </ha-backup-overview-summary>
                  `
                : nothing}

          <ha-backup-overview-backups
            .hass=${this.hass}
            .backups=${this.backups}
          ></ha-backup-overview-backups>

          ${!this._needsOnboarding && this.config
            ? html`
                <ha-card>
                  <div class="card-header">
                    ${this.hass.localize(
                      "ui.panel.config.backup.settings.encryption_key.title"
                    )}
                  </div>
                  <div class="card-content">
                    <p>
                      ${this.hass.localize(
                        "ui.panel.config.backup.settings.encryption_key.description"
                      )}
                    </p>
                    <ha-backup-config-encryption-key
                      .hass=${this.hass}
                      .value=${this.config.create_backup.password}
                      @value-changed=${this._encryptionKeyChanged}
                    ></ha-backup-config-encryption-key>
                  </div>
                </ha-card>

                <ha-backup-overview-settings
                  .hass=${this.hass}
                  .config=${this.config!}
                  .agents=${this.agents}
                ></ha-backup-overview-settings>

                ${this.hass.config.components.includes("hassio")
                  ? html`
                      <ha-backup-overview-app-update-backup
                        .hass=${this.hass}
                      ></ha-backup-overview-app-update-backup>
                    `
                  : nothing}
              `
            : nothing}
        </div>

        <ha-button
          slot="fab"
          size="large"
          .loading=${backupInProgress}
          @click=${this._newBackup}
        >
          <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.backup.overview.new_backup")}
        </ha-button>
      </hass-subpage>
    `;
  }

  private _handleDropdownSelect(ev: HaDropdownSelectEvent) {
    const action = ev.detail?.item.value;

    if (action === "upload_backup") {
      this._uploadBackup();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        p {
          color: var(--secondary-text-color);
        }

        .content {
          padding: 28px 20px 0;
          max-width: 690px;
          margin: 0 auto;
          gap: var(--ha-space-6);
          display: flex;
          flex-direction: column;
          margin-bottom: calc(var(--safe-area-inset-bottom) + 72px);
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
        .loading {
          display: flex;
        }
        ha-spinner {
          --ha-spinner-indicator-color: var(--mdc-theme-on-secondary);
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
