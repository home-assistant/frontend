import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-password-field";
import "../../../components/ha-settings-row";
import type { BackupConfig } from "../../../data/backup";
import {
  BackupScheduleState,
  fetchBackupConfig,
  updateBackupConfig,
} from "../../../data/backup";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import "./components/ha-backup-config-agents";
import "./components/ha-backup-config-data";
import type { BackupConfigData } from "./components/ha-backup-config-data";
import "./components/ha-backup-config-encryption-key";
import "./components/ha-backup-config-schedule";
import type { BackupConfigSchedule } from "./components/ha-backup-config-schedule";

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

  protected willUpdate(changedProps) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._fetchData();
    }
  }

  private async _fetchData() {
    const { config } = await fetchBackupConfig(this.hass);
    this._backupConfig = config;
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
        .header=${"Backup strategy"}
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
              <ha-backup-config-agents
                .hass=${this.hass}
                .value=${this._backupConfig.create_backup.agent_ids}
                @value-changed=${this._agentsConfigChanged}
              ></ha-backup-config-agents>
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
              <ha-backup-config-encryption-key
                .hass=${this.hass}
                .value=${this._backupConfig.create_backup.password}
                @value-changed=${this._encryptionKeyChanged}
              ></ha-backup-config-encryption-key>
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

  private _agentsConfigChanged(ev) {
    const agents = ev.detail.value as string[];
    this._backupConfig = {
      ...this._backupConfig,
      create_backup: {
        ...this._backupConfig.create_backup,
        agent_ids: agents,
      },
    };
    this._debounceSave();
  }

  private _encryptionKeyChanged(ev) {
    const password = ev.detail.value as string;
    this._backupConfig = {
      ...this._backupConfig,
      create_backup: {
        ...this._backupConfig.create_backup,
        password: password,
      },
    };
    this._debounceSave();
  }

  private _debounceSave = debounce(() => this._save(), 500);

  private async _save() {
    await updateBackupConfig(this.hass, {
      create_backup: {
        agent_ids: this._backupConfig.create_backup.agent_ids,
        include_folders: this._backupConfig.create_backup.include_folders ?? [],
        include_database: this._backupConfig.create_backup.include_database,
        include_addons: this._backupConfig.create_backup.include_addons ?? [],
        include_all_addons: this._backupConfig.create_backup.include_all_addons,
        password: this._backupConfig.create_backup.password,
      },
      retention: this._backupConfig.retention,
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
