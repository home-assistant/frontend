import type { ActionDetail } from "@material/mwc-list";
import {
  mdiDelete,
  mdiDotsVertical,
  mdiDownload,
  mdiHarddisk,
  mdiNas,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-fade-in";
import "../../../components/ha-spinner";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import type {
  BackupAgent,
  BackupConfig,
  BackupContentAgent,
  BackupContentExtended,
} from "../../../data/backup";
import "./components/ha-backup-details-summary";
import "./components/ha-backup-details-restore";
import {
  compareAgents,
  computeBackupAgentName,
  deleteBackup,
  fetchBackupDetails,
  isLocalAgent,
  isNetworkMountAgent,
} from "../../../data/backup";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { showRestoreBackupDialog } from "./dialogs/show-dialog-restore-backup";
import { fireEvent } from "../../../common/dom/fire_event";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { downloadBackup } from "./helper/download_backup";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";

interface Agent extends BackupContentAgent {
  id: string;
  success: boolean;
}

const computeAgents = (backup: BackupContentExtended) => {
  const agentIds = Object.keys(backup.agents);
  const failedAgentIds = backup.failed_agent_ids ?? [];
  return [
    ...agentIds.filter((id) => !failedAgentIds.includes(id)),
    ...failedAgentIds,
  ]
    .map<Agent>((id) => {
      const agent: BackupContentAgent = backup.agents[id] ?? {
        protected: false,
        size: 0,
      };
      return {
        ...agent,
        id: id,
        success: !failedAgentIds.includes(id),
      };
    })
    .sort((a, b) => compareAgents(a.id, b.id));
};

@customElement("ha-config-backup-details")
class HaConfigBackupDetails extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "backup-id" }) public backupId!: string;

  @property({ attribute: false }) public config?: BackupConfig;

  @property({ attribute: false }) public agents: BackupAgent[] = [];

  @state() private _backup?: BackupContentExtended | null;

  @state() private _agents: Agent[] = [];

  @state() private _error?: string;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (this.backupId) {
      this._fetchBackup();
    } else {
      this._error = "Backup id not defined";
    }
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const isHassio = isComponentLoaded(this.hass, "hassio");

    return html`
      <hass-subpage
        back-path="/config/backup/backups"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this._backup?.name ||
        this.hass.localize("ui.panel.config.backup.details.header")}
      >
        <ha-button-menu slot="toolbar-icon" @action=${this._handleAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-list-item graphic="icon">
            <ha-svg-icon slot="graphic" .path=${mdiDownload}></ha-svg-icon>
            ${this.hass.localize("ui.common.download")}
          </ha-list-item>
          <ha-list-item graphic="icon" class="warning">
            <ha-svg-icon slot="graphic" .path=${mdiDelete}></ha-svg-icon>
            ${this.hass.localize("ui.common.delete")}
          </ha-list-item>
        </ha-button-menu>
        <div class="content">
          ${this._error &&
          html`<ha-alert alert-type="error">${this._error}</ha-alert>`}
          ${this._backup === null
            ? html`
                <ha-alert
                  alert-type="warning"
                  .title=${this.hass.localize(
                    "ui.panel.config.backup.details.not_found"
                  )}
                >
                  ${this.hass.localize(
                    "ui.panel.config.backup.details.not_found_description",
                    { backupId: this.backupId }
                  )}
                </ha-alert>
              `
            : !this._backup
              ? html`<ha-fade-in .delay=${1000}
                  ><ha-spinner></ha-spinner
                ></ha-fade-in>`
              : html`
                  <ha-backup-details-summary
                    .backup=${this._backup}
                    .hass=${this.hass}
                    .localize=${this.hass.localize}
                    .isHassio=${isHassio}
                  ></ha-backup-details-summary>
                  <ha-backup-details-restore
                    .backup=${this._backup}
                    @backup-restore=${this._restore}
                    .hass=${this.hass}
                    .localize=${this.hass.localize}
                  ></ha-backup-details-restore>
                  <ha-card>
                    <div class="card-header">
                      ${this.hass.localize(
                        "ui.panel.config.backup.details.locations.title"
                      )}
                    </div>
                    <div class="card-content">
                      <ha-md-list>
                        ${this._agents.map((agent) => {
                          const agentId = agent.id;

                          const domain = computeDomain(agentId);
                          const name = computeBackupAgentName(
                            this.hass.localize,
                            agentId,
                            this.agents
                          );
                          const success = agent.success;
                          const failed = !agent.success;
                          const unencrypted = !agent.protected;

                          return html`
                            <ha-md-list-item>
                              ${
                                isLocalAgent(agentId)
                                  ? html`
                                      <ha-svg-icon
                                        .path=${mdiHarddisk}
                                        slot="start"
                                      >
                                      </ha-svg-icon>
                                    `
                                  : isNetworkMountAgent(agentId)
                                    ? html`
                                        <ha-svg-icon
                                          .path=${mdiNas}
                                          slot="start"
                                        ></ha-svg-icon>
                                      `
                                    : html`
                                        <img
                                          .src=${brandsUrl({
                                            domain,
                                            type: "icon",
                                            useFallback: true,
                                            darkOptimized:
                                              this.hass.themes?.darkMode,
                                          })}
                                          crossorigin="anonymous"
                                          referrerpolicy="no-referrer"
                                          alt=${`${domain} logo`}
                                          slot="start"
                                        />
                                      `
                              }
                              <div slot="headline">${name}</div>
                                <div slot="supporting-text">
                                   ${
                                     failed
                                       ? html`
                                           <span class="dot error"></span>
                                           <span>
                                             ${this.hass.localize(
                                               "ui.panel.config.backup.details.locations.backup_failed"
                                             )}
                                           </span>
                                         `
                                       : unencrypted
                                         ? html`
                                             <span class="dot warning"></span>
                                             <span>
                                               ${this.hass.localize(
                                                 "ui.panel.config.backup.details.locations.unencrypted"
                                               )}</span
                                             >
                                           `
                                         : html`
                                             <span class="dot success"></span>
                                             <span
                                               >${this.hass.localize(
                                                 "ui.panel.config.backup.details.locations.encrypted"
                                               )}</span
                                             >
                                           `
                                   }
                                </div>
                              </div>
                              ${
                                success
                                  ? html`
                                      <ha-button-menu
                                        slot="end"
                                        @action=${this._handleAgentAction}
                                        .agent=${agentId}
                                        fixed
                                      >
                                        <ha-icon-button
                                          slot="trigger"
                                          .label=${this.hass.localize(
                                            "ui.common.menu"
                                          )}
                                          .path=${mdiDotsVertical}
                                        ></ha-icon-button>
                                        <ha-list-item graphic="icon">
                                          <ha-svg-icon
                                            slot="graphic"
                                            .path=${mdiDownload}
                                          ></ha-svg-icon>
                                          ${this.hass.localize(
                                            "ui.panel.config.backup.details.locations.download"
                                          )}
                                        </ha-list-item>
                                      </ha-button-menu>
                                    `
                                  : nothing
                              }
                            </ha-md-list-item>
                          `;
                        })}
                      </ha-md-list>
                    </div>
                  </ha-card>
                `}
        </div>
      </hass-subpage>
    `;
  }

  private _restore(ev: CustomEvent) {
    if (!this._backup || !ev.detail.selectedData) {
      return;
    }
    showRestoreBackupDialog(this, {
      backup: this._backup,
      selectedData: ev.detail.selectedData,
    });
  }

  private async _fetchBackup() {
    try {
      const response = await fetchBackupDetails(this.hass, this.backupId);
      this._backup = response.backup;
      this._agents = computeAgents(response.backup);
    } catch (err: any) {
      this._error =
        err?.message ||
        this.hass.localize("ui.panel.config.backup.details.error");
    }
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._downloadBackup();
        break;
      case 1:
        this._deleteBackup();
        break;
    }
  }

  private _handleAgentAction(ev: CustomEvent<ActionDetail>) {
    const button = ev.currentTarget;
    const agentId = (button as any).agent;
    this._downloadBackup(agentId);
  }

  private async _downloadBackup(agentId?: string): Promise<void> {
    await downloadBackup(this.hass, this, this._backup!, this.config, agentId);
  }

  private async _deleteBackup(): Promise<void> {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.backup.dialogs.delete.title"),
      text: this.hass.localize("ui.panel.config.backup.dialogs.delete.text"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
    });

    if (!confirm) {
      return;
    }

    await deleteBackup(this.hass, this._backup!.backup_id);
    fireEvent(this, "ha-refresh-backup-info");
    navigate("/config/backup");
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 690px;
      margin: 0 auto;
      gap: 24px;
      display: grid;
      margin-bottom: 24px;
    }
    ha-spinner {
      margin: 24px auto;
    }
    .card-content {
      padding: 0 20px;
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
    }
    ha-md-list {
      background: none;
      padding: 0;
    }
    ha-md-list-item {
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
      --md-list-item-two-line-container-height: 64px;
    }
    ha-md-list-item img {
      width: 48px;
    }
    ha-md-list-item ha-svg-icon[slot="start"] {
      --mdc-icon-size: 48px;
      color: var(--primary-text-color);
    }
    .warning {
      color: var(--error-color);
    }
    .warning ha-svg-icon {
      color: var(--error-color);
    }
    ha-button.danger {
      --mdc-theme-primary: var(--error-color);
    }
    ha-md-list-item [slot="supporting-text"] {
      display: flex;
      align-items: center;
      flex-direction: row;
      gap: 8px;
      line-height: var(--ha-line-height-condensed);
    }
    .dot {
      display: block;
      position: relative;
      width: 8px;
      height: 8px;
      background-color: var(--disabled-color);
      border-radius: 50%;
      flex: none;
    }
    .dot.success {
      background-color: var(--success-color);
    }
    .dot.warning {
      background-color: var(--warning-color);
    }
    .dot.error {
      background-color: var(--error-color);
    }
    .card-header {
      padding-bottom: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-details": HaConfigBackupDetails;
  }
}
