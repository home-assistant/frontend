import { mdiDownload } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-password-field";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { BackupAgent, BackupConfig } from "../../../data/backup";
import {
  BackupScheduleState,
  fetchBackupAgentsInfo,
  fetchBackupConfig,
  updateBackupConfig,
} from "../../../data/backup";
import { domainToName } from "../../../data/integration";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import "./components/ha-backup-config-data";
import type { BackupConfigData } from "./components/ha-backup-config-data";
import "./components/ha-backup-config-schedule";
import type { BackupConfigSchedule } from "./components/ha-backup-config-schedule";
import { showChangeBackupPasswordDialog } from "./dialogs/show-dialog-change-backup-password";

const INITIAL_BACKUP_CONFIG: BackupConfig = {
  create_backup: {
    agent_ids: [],
    include_folders: [],
    include_database: true,
    include_addons: [],
    include_all_addons: true,
    password: null,
    name: null,
  },
  retention: {
    days: null,
    copies: 3,
  },
  schedule: { state: BackupScheduleState.NEVER },
  last_automatic_backup: null,
};

@customElement("ha-config-backup-default-config")
class HaConfigBackupDefaultConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _backupConfig: BackupConfig = INITIAL_BACKUP_CONFIG;

  @state() private _agents: BackupAgent[] = [];

  protected willUpdate(changedProps) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._fetchData();
    }
  }

  private async _fetchData() {
    const [backupConfig, agentInfo] = await Promise.all([
      fetchBackupConfig(this.hass),
      fetchBackupAgentsInfo(this.hass),
    ]);
    this._backupConfig = backupConfig.config;
    this._agents = agentInfo.agents;
  }

  protected render() {
    if (!this._backupConfig) {
      return nothing;
    }

    return html`
      <hass-subpage
        back-path="/config/backup"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${"Default backup"}
      >
        <div class="content">
          <ha-card>
            <div class="card-header">Automatic backups</div>
            <div class="card-content">
              <p>
                Let Home Assistant take care of your backup strategy by creating
                a scheduled backup that also removes older copies.
              </p>
              <ha-backup-config-schedule
                .hass=${this.hass}
                .value=${this._backupConfig}
                @value-changed=${this._scheduleConfigChanged}
              ></ha-backup-config-schedule>
            </div>
          </ha-card>
          <ha-card>
            <div class="card-header">Backup data</div>
            <div class="card-content">
              <ha-backup-config-data
                .hass=${this.hass}
                .value=${this._dataConfig}
                @value-changed=${this._dataConfigChanged}
                force-home-assistant
              ></ha-backup-config-data>
            </div>
          </ha-card>

          <ha-card class="agents">
            <div class="card-header">Locations</div>
            <div class="card-content">
              <p>
                Your backup will be stored on these locations when this default
                backup is created. You can use all locations for custom backups.
              </p>
              ${this._agents.length > 0
                ? html`
                    <ha-md-list>
                      ${this._agents.map((agent) => {
                        const [domain, name] = agent.agent_id.split(".");
                        const domainName = domainToName(
                          this.hass.localize,
                          domain
                        );
                        return html`
                          <ha-md-list-item>
                            <img
                              .src=${brandsUrl({
                                domain,
                                type: "icon",
                                useFallback: true,
                                darkOptimized: this.hass.themes?.darkMode,
                              })}
                              crossorigin="anonymous"
                              referrerpolicy="no-referrer"
                              alt=""
                              slot="start"
                            />
                            <div slot="headline">${domainName}: ${name}</div>
                            <ha-switch
                              slot="end"
                              id=${agent.agent_id}
                              .checked=${this._backupConfig?.create_backup.agent_ids.includes(
                                agent.agent_id
                              )}
                              @change=${this._handleAgentToggle}
                            ></ha-switch>
                          </ha-md-list-item>
                        `;
                      })}
                    </ha-md-list>
                  `
                : html`<p>No sync agents configured</p>`}
            </div>
          </ha-card>
          <ha-card>
            <div class="card-header">Encryption key</div>
            <div class="card-content">
              <p>
                All your backups are encrypted to keep your data private and
                secure. You need this key to restore a backup. It's important
                that you don't lose this key, as no one else can restore your
                data.
              </p>
              ${this._backupConfig.create_backup.password
                ? html` <ha-settings-row>
                      <span slot="heading">Download emergency kit</span>
                      <span slot="description">
                        We recommend to save this encryption key somewhere
                        secure.
                      </span>
                      <ha-button @click=${this._downloadPassword}
                        ><ha-svg-icon
                          .path=${mdiDownload}
                          slot="icon"
                        ></ha-svg-icon
                        >Download</ha-button
                      >
                    </ha-settings-row>
                    <ha-settings-row>
                      <span slot="heading">Change encryption key</span>
                      <span slot="description">
                        All next backups will be encrypted with this new key.
                      </span>
                      <ha-button class="alert" @click=${this._changePassword}
                        >Change key</ha-button
                      >
                    </ha-settings-row>`
                : html`<ha-button unelevated @click=${this._changePassword}
                    >Set encryption key</ha-button
                  >`}
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _scheduleConfigChanged(ev) {
    const value = ev.detail.value as BackupConfigSchedule;
    this._backupConfig = {
      ...this._backupConfig,
      schedule: value.schedule,
      retention: value.retention,
    };
    this._debounceSave();
  }

  private get _dataConfig(): BackupConfigData {
    const {
      include_addons,
      include_all_addons,
      include_database,
      include_folders,
    } = this._backupConfig.create_backup;

    return {
      include_homeassistant: true,
      include_database,
      include_folders: include_folders || undefined,
      include_all_addons,
      include_addons: include_addons || undefined,
    };
  }

  private _dataConfigChanged(ev) {
    const data = ev.detail.value as BackupConfigData;
    this._backupConfig = {
      ...this._backupConfig,
      create_backup: {
        ...this._backupConfig.create_backup,
        include_database: data.include_database,
        include_folders: data.include_folders || null,
        include_all_addons: data.include_all_addons,
        include_addons: data.include_addons || null,
      },
    };
    this._debounceSave();
  }

  private _handleAgentToggle(ev) {
    const agentId = ev.target.id;
    if (ev.target.checked) {
      this._backupConfig = {
        ...this._backupConfig,
        create_backup: {
          ...this._backupConfig.create_backup,
          agent_ids: [...this._backupConfig.create_backup.agent_ids, agentId],
        },
      };
    } else {
      this._backupConfig = {
        ...this._backupConfig,
        create_backup: {
          ...this._backupConfig.create_backup,
          agent_ids: this._backupConfig.create_backup.agent_ids.filter(
            (id) => id !== agentId
          ),
        },
      };
    }
    this._debounceSave();
  }

  private _downloadPassword() {
    if (!this._backupConfig?.create_backup.password) {
      return;
    }
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," +
        encodeURIComponent(this._backupConfig.create_backup.password)
    );
    element.setAttribute("download", "emergency_kit.txt");

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  private async _changePassword() {
    const result = await showChangeBackupPasswordDialog(this, {
      currentPassword: this._backupConfig.create_backup.password ?? undefined,
    });
    if (result === null) {
      return;
    }
    this._backupConfig = {
      ...this._backupConfig,
      create_backup: {
        ...this._backupConfig.create_backup,
        password: result,
      },
    };
    this._debounceSave();
  }

  private _debounceSave = debounce(() => this._save(), 500);

  private async _save() {
    await updateBackupConfig(this.hass, {
      create_backup: {
        agent_ids: this._backupConfig.create_backup.agent_ids.filter((id) =>
          this._agents.some((agent) => agent.agent_id === id)
        ),
        include_folders: this._backupConfig.create_backup.include_folders,
        include_database: this._backupConfig.create_backup.include_database,
        include_addons: this._backupConfig.create_backup.include_addons || [],
        include_all_addons: this._backupConfig.create_backup.include_all_addons,
        password: this._backupConfig.create_backup.password,
      },
      retention: {
        copies: this._backupConfig.retention.copies,
      },
      schedule: this._backupConfig.schedule.state,
    });
  }

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 690px;
      margin: 0 auto;
      gap: 24px;
      display: flex;
      flex-direction: column;
      margin-bottom: 24px;
    }
    ha-settings-row {
      --settings-row-prefix-display: flex;
      padding: 0;
    }
    ha-settings-row > ha-svg-icon {
      align-self: center;
      margin-inline-end: 16px;
    }
    ha-md-list {
      background: none;
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
    }
    ha-md-list-item img {
      width: 48px;
    }
    .alert {
      --mdc-theme-primary: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-default-config": HaConfigBackupDefaultConfig;
  }
}
