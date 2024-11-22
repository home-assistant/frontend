import { mdiChartBox, mdiCog, mdiFolder, mdiPlayBoxMultiple } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-md-select";
import "../../../components/ha-md-select-option";
import "../../../components/ha-password-field";
import "../../../components/ha-select";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { BackupAgent, BackupConfig } from "../../../data/backup";
import type { BackupAddon } from "./components/ha-backup-addons-picker";
import {
  BackupScheduleState,
  fetchBackupAgentsInfo,
  fetchBackupConfig,
  updateBackupConfig,
} from "../../../data/backup";
import { fetchHassioAddonsInfo } from "../../../data/hassio/addon";
import { domainToName } from "../../../data/integration";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import "./components/ha-backup-addons-picker";

const SELF_CREATED_ADDONS_FOLDER = "addons/local";

@customElement("ha-config-backup-default-config")
class HaConfigBackupDefaultConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _backupConfig?: BackupConfig;

  @state() private _agents: BackupAgent[] = [];

  @state() private _addons: BackupAddon[] = [];

  protected willUpdate(changedProps) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._fetchData();
    }
  }

  private async _fetchData() {
    if (isComponentLoaded(this.hass, "hassio")) {
      this._fetchAddons();
    }
    const [backupConfig, agentInfo] = await Promise.all([
      fetchBackupConfig(this.hass),
      fetchBackupAgentsInfo(this.hass),
    ]);
    this._backupConfig = backupConfig.config;
    this._agents = agentInfo.agents;
  }

  private async _fetchAddons() {
    const { addons } = await fetchHassioAddonsInfo(this.hass);
    this._addons = [
      ...addons,
      {
        name: "Self created add-ons",
        slug: SELF_CREATED_ADDONS_FOLDER,
      },
    ];
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
            <div class="card-header space-apart">
              Automatic backups
              <ha-switch
                @change=${this._toggleSchedule}
                .checked=${this._backupConfig.schedule.state !==
                BackupScheduleState.NEVER}
              ></ha-switch>
            </div>
            <div class="card-content">
              <p>
                Let Home Assistant take care of your backup strategy by creating
                a scheduled backup that also removes older copies.
              </p>
              <ha-settings-row>
                <span slot="heading">Schedule</span>
                <span slot="description">
                  How often you want to create a backup.
                </span>
                <ha-select
                  naturalMenuWidth
                  .value=${this._backupConfig.schedule.state}
                  @selected=${this._scheduleChanged}
                  .disabled=${this._backupConfig.schedule.state ===
                  BackupScheduleState.NEVER}
                >
                  <ha-list-item .value=${BackupScheduleState.DAILY}
                    >Daily at 02:00</ha-list-item
                  >
                  <ha-list-item .value=${BackupScheduleState.MONDAY}
                    >Monday at 02:00</ha-list-item
                  >
                  <ha-list-item .value=${BackupScheduleState.TUESDAY}
                    >Tuesday at 02:00</ha-list-item
                  >
                  <ha-list-item .value=${BackupScheduleState.WEDNESDAY}
                    >Wednesday at 02:00</ha-list-item
                  >
                  <ha-list-item .value=${BackupScheduleState.THURSDAY}
                    >Thursday at 02:00</ha-list-item
                  >
                  <ha-list-item .value=${BackupScheduleState.FRIDAY}
                    >Friday at 02:00</ha-list-item
                  >
                  <ha-list-item .value=${BackupScheduleState.SATURDAY}
                    >Saturday at 02:00</ha-list-item
                  >
                  <ha-list-item .value=${BackupScheduleState.SUNDAY}
                    >Sunday at 02:00</ha-list-item
                  >
                </ha-select>
              </ha-settings-row>
              <ha-settings-row>
                <span slot="heading">Maximum copies</span>
                <span slot="description">
                  The number of backups that are saved
                </span>
                <ha-select
                  naturalMenuWidth
                  .value=${this._backupConfig.max_copies ?? 0}
                  @selected=${this._maxCopiesChanged}
                  .disabled=${this._backupConfig.schedule.state ===
                  BackupScheduleState.NEVER}
                >
                  <ha-list-item .value=${1}>Latest 1 copies</ha-list-item>
                  <ha-list-item .value=${2}>Latest 2 copies</ha-list-item>
                  <ha-list-item .value=${3}>Latest 3 copies</ha-list-item>
                  <ha-list-item .value=${4}>Latest 4 copies</ha-list-item>
                  <ha-list-item .value=${5}>Latest 5 copies</ha-list-item>
                  <ha-list-item .value=${6}>Latest 6 copies</ha-list-item>
                  <ha-list-item .value=${7}>Latest 7 copies</ha-list-item>
                  <ha-list-item .value=${0}>Forever</ha-list-item>
                </ha-select>
              </ha-settings-row>
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
                ? html` <ha-password-field
                      .value=${this._backupConfig.create_backup.password}
                    ></ha-password-field>
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
          <ha-card>
            <div class="card-header">Backup data</div>
            <div class="card-content">
              <ha-settings-row>
                <ha-svg-icon slot="prefix" .path=${mdiCog}></ha-svg-icon>
                <span slot="heading"
                  >Home Assistant settings are always included</span
                >
                <span slot="description">
                  The bare minimum needed to restore your system.
                </span>
                <ha-button>Learn more</ha-button>
              </ha-settings-row>
              <ha-settings-row>
                <ha-svg-icon slot="prefix" .path=${mdiChartBox}></ha-svg-icon>
                <span slot="heading">History</span>
                <span slot="description"
                  >For example of your energy dashboard.</span
                >
                <ha-switch
                  id="database"
                  name="database"
                  @change=${this._databaseSwitchChanged}
                  .checked=${this._backupConfig.create_backup.include_database}
                ></ha-switch>
              </ha-settings-row>
              <ha-settings-row>
                <ha-svg-icon
                  slot="prefix"
                  .path=${mdiPlayBoxMultiple}
                ></ha-svg-icon>
                <span slot="heading">Media</span>
                <span slot="description">
                  Folder that is often used for advanced or older
                  configurations.
                </span>
                <ha-switch
                  id="media"
                  name="media"
                  @change=${this._folderSwitchChanged}
                  .checked=${this._backupConfig.create_backup.include_folders?.includes(
                    "media"
                  )}
                ></ha-switch>
              </ha-settings-row>
              <ha-settings-row>
                <ha-svg-icon slot="prefix" .path=${mdiFolder}></ha-svg-icon>
                <span slot="heading">Share folder</span>
                <span slot="description">
                  Folder that is often used for advanced or older
                  configurations.
                </span>
                <ha-switch
                  id="share"
                  name="share"
                  @change=${this._folderSwitchChanged}
                  .checked=${this._backupConfig.create_backup.include_folders?.includes(
                    "share"
                  )}
                ></ha-switch>
              </ha-settings-row>
              ${this._addons.length > 0
                ? html`
                    <ha-settings-row>
                      <span slot="heading">Add-ons</span>
                      <span slot="description">
                        Select what add-ons you want to backup.
                      </span>
                      <ha-md-select
                        id="addons_mode"
                        @change=${this._addonModeChanged}
                        .value=${this._backupConfig.create_backup
                          .include_all_addons
                          ? "all"
                          : "custom"}
                      >
                        <ha-md-select-option value="all">
                          <div slot="headline">
                            All (${this._addons.length})
                          </div>
                        </ha-md-select-option>
                        <ha-md-select-option value="custom">
                          <div slot="headline">Custom</div>
                        </ha-md-select-option>
                      </ha-md-select>
                    </ha-settings-row>
                    ${!this._backupConfig.create_backup.include_all_addons
                      ? html`
                          <ha-expansion-panel
                            .header=${"Add-ons"}
                            outlined
                            expanded
                          >
                            <ha-backup-addons-picker
                              .hass=${this.hass}
                              .value=${this._backupConfig.create_backup
                                .include_addons ||
                              this._addons.map((a) => a.slug)}
                              @value-changed=${this._addonsChanged}
                              .addons=${this._addons}
                            ></ha-backup-addons-picker>
                          </ha-expansion-panel>
                        `
                      : nothing}
                  `
                : nothing}
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
        </div>
      </hass-subpage>
    `;
  }

  private _toggleSchedule(ev) {
    if (!this._backupConfig) {
      return;
    }
    if (ev.target.checked) {
      this._backupConfig = {
        ...this._backupConfig,
        max_copies: this._backupConfig.max_copies ?? 3,
        schedule: {
          ...this._backupConfig.schedule,
          state: BackupScheduleState.DAILY,
        },
      };
    } else {
      this._backupConfig = {
        ...this._backupConfig,
        schedule: {
          ...this._backupConfig.schedule,
          state: BackupScheduleState.NEVER,
        },
      };
    }
    this._debounceSave();
  }

  private _scheduleChanged(ev) {
    if (!this._backupConfig || !ev.target.value) {
      return;
    }
    this._backupConfig = {
      ...this._backupConfig,
      schedule: {
        ...this._backupConfig.schedule,
        state: ev.target.value as BackupScheduleState,
      },
    };
    this._debounceSave();
  }

  private _maxCopiesChanged(ev) {
    if (!this._backupConfig) {
      return;
    }
    this._backupConfig = {
      ...this._backupConfig,
      max_copies: ev.target.value,
    };
    this._debounceSave();
  }

  private _folderSwitchChanged(ev) {
    if (!this._backupConfig) {
      return;
    }
    const id = ev.target.id;
    const checked = ev.target.checked;
    if (!this._backupConfig.create_backup.include_folders) {
      this._backupConfig = {
        ...this._backupConfig,
        create_backup: {
          ...this._backupConfig.create_backup,
          include_folders: [],
        },
      };
    }
    if (checked) {
      this._backupConfig = {
        ...this._backupConfig,
        create_backup: {
          ...this._backupConfig.create_backup,
          include_folders: [
            ...this._backupConfig.create_backup.include_folders!,
            id,
          ],
        },
      };
    } else {
      this._backupConfig = {
        ...this._backupConfig,
        create_backup: {
          ...this._backupConfig.create_backup,
          include_folders:
            this._backupConfig.create_backup.include_folders!.filter(
              (folder) => folder !== id
            ),
        },
      };
    }
    this._debounceSave();
  }

  private _addonModeChanged(ev) {
    if (!this._backupConfig) {
      return;
    }
    this._backupConfig = {
      ...this._backupConfig,
      create_backup: {
        ...this._backupConfig.create_backup,
        include_all_addons: ev.target.value === "all",
      },
    };
    this._debounceSave();
  }

  private _addonsChanged(ev) {
    if (!this._backupConfig) {
      return;
    }
    this._backupConfig = {
      ...this._backupConfig,
      create_backup: {
        ...this._backupConfig.create_backup,
        include_addons: ev.detail.value,
      },
    };
    this._debounceSave();
  }

  private _databaseSwitchChanged(ev) {
    if (!this._backupConfig) {
      return;
    }
    this._backupConfig = {
      ...this._backupConfig,
      create_backup: {
        ...this._backupConfig.create_backup,
        include_database: ev.target.checked,
      },
    };
    this._debounceSave();
  }

  private _handleAgentToggle(ev) {
    if (!this._backupConfig) {
      return;
    }
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

  private _changePassword() {
    if (!this._backupConfig) {
      return;
    }
    this._backupConfig = {
      ...this._backupConfig,
      create_backup: {
        ...this._backupConfig.create_backup,
        password: "new-password",
      },
    };
    this._debounceSave();
  }

  private _debounceSave = debounce(() => this._save(), 500);

  private async _save() {
    if (!this._backupConfig) {
      return;
    }
    await updateBackupConfig(this.hass, {
      create_backup: {
        agent_ids: this._backupConfig.create_backup.agent_ids,
        include_folders: this._backupConfig.create_backup.include_folders,
        include_database: this._backupConfig.create_backup.include_database,
        include_addons: this._backupConfig.create_backup.include_addons || [],
        include_all_addons: this._backupConfig.create_backup.include_all_addons,
        password: this._backupConfig.create_backup.password,
      },
      max_copies: this._backupConfig.max_copies ?? 0,
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
    }
    .card-header.space-apart {
      display: flex;
      align-items: center;
      justify-content: space-between;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-default-config": HaConfigBackupDefaultConfig;
  }
}
