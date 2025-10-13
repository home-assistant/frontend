import { mdiDotsVertical, mdiPlus, mdiUpload } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-spinner";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-list-item";
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
} from "../../../data/backup";
import type { ManagerStateEvent } from "../../../data/backup_manager";
import type { CloudStatus } from "../../../data/cloud";
import "../../../layouts/hass-subpage";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
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

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public manager!: ManagerStateEvent;

  @property({ attribute: false }) public info?: BackupInfo;

  @property({ attribute: false }) public backups: BackupContent[] = [];

  @property({ attribute: false }) public fetching = false;

  @property({ attribute: false }) public config?: BackupConfig;

  @property({ attribute: false }) public agents: BackupAgent[] = [];

  private async _uploadBackup(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    await showUploadBackupDialog(this, {});
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
    await generateBackupWithAutomaticSettings(this.hass);
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

    if (type === "manual") {
      const params = await showGenerateBackupDialog(this, {
        cloudStatus: this.cloudStatus,
      });

      if (!params) {
        return;
      }

      await generateBackup(this.hass, params);
      fireEvent(this, "ha-refresh-backup-info");
      return;
    }
    if (type === "automatic") {
      await generateBackupWithAutomaticSettings(this.hass);
      fireEvent(this, "ha-refresh-backup-info");
    }
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
        <ha-button-menu slot="toolbar-icon">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-list-item graphic="icon" @request-selected=${this._uploadBackup}>
            <ha-svg-icon slot="graphic" .path=${mdiUpload}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.backup.overview.menu.upload_backup"
            )}
          </ha-list-item>
        </ha-button-menu>
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
                <ha-backup-overview-settings
                  .hass=${this.hass}
                  .config=${this.config!}
                  .agents=${this.agents}
                ></ha-backup-overview-settings>
              `
            : nothing}
        </div>

        <ha-fab
          slot="fab"
          ?disabled=${backupInProgress}
          .label=${this.hass.localize(
            "ui.panel.config.backup.overview.new_backup"
          )}
          extended
          @click=${this._newBackup}
        >
          ${backupInProgress
            ? html`<div slot="icon" class="loading">
                <ha-spinner .size=${"small"}></ha-spinner>
              </div>`
            : html`<ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>`}
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
          gap: var(--ha-space-6);
          display: flex;
          flex-direction: column;
          margin-bottom: calc(var(--safe-area-inset-bottom) + 72px);
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
        .card-content {
          padding-left: 0;
          padding-right: 0;
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
