import {
  mdiDelete,
  mdiDotsVertical,
  mdiDownload,
  mdiHarddisk,
  mdiNas,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-fade-in";
import "../../../components/ha-icon-button";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-spinner";
import type {
  BackupAgent,
  BackupConfig,
  BackupContentAgent,
  BackupContentExtended,
} from "../../../data/backup";
import {
  compareAgents,
  computeBackupAgentName,
  deleteBackup,
  fetchBackupDetails,
  isLocalAgent,
  isNetworkMountAgent,
} from "../../../data/backup";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import "./components/ha-backup-details-restore";
import "./components/ha-backup-details-summary";
import { showRestoreBackupDialog } from "./dialogs/show-dialog-restore-backup";
import { downloadBackup } from "./helper/download_backup";

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
        <ha-dropdown slot="toolbar-icon" @wa-select=${this._handleAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-dropdown-item value="download">
            <ha-svg-icon slot="icon" .path=${mdiDownload}></ha-svg-icon>
            ${this.hass.localize("ui.common.download")}
          </ha-dropdown-item>
          <ha-dropdown-item value="delete" variant="danger">
            <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
            ${this.hass.localize("ui.common.delete")}
          </ha-dropdown-item>
        </ha-dropdown>
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
                                      <ha-dropdown
                                        slot="end"
                                        @wa-select=${this._handleAgentAction}
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
                                        <ha-dropdown-item value="download">
                                          <ha-svg-icon
                                            slot="icon"
                                            .path=${mdiDownload}
                                          ></ha-svg-icon>
                                          ${this.hass.localize(
                                            "ui.panel.config.backup.details.locations.download"
                                          )}
                                        </ha-dropdown-item>
                                      </ha-dropdown>
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

  private _handleAction(ev: CustomEvent<{ item: { value: string } }>) {
    const action = ev.detail.item.value;
    switch (action) {
      case "download":
        this._downloadBackup();
        break;
      case "delete":
        this._deleteBackup();
        break;
    }
  }

  private _handleAgentAction(ev: CustomEvent<{ item: { value: string } }>) {
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
      gap: var(--ha-space-6);
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
    ha-button.danger {
      --mdc-theme-primary: var(--error-color);
    }
    ha-md-list-item [slot="supporting-text"] {
      display: flex;
      align-items: center;
      flex-direction: row;
      gap: var(--ha-space-2);
      line-height: var(--ha-line-height-condensed);
    }
    .dot {
      display: block;
      position: relative;
      width: 8px;
      height: 8px;
      background-color: var(--disabled-color);
      border-radius: var(--ha-border-radius-circle);
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
