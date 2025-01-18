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
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import {
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

  @property({ attribute: false }) public backups: BackupContent[] = [];

  @property({ attribute: false }) public fetching = false;

  @property({ attribute: false }) public config?: BackupConfig;

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
    return this.config && !this.config.create_backup.password;
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
