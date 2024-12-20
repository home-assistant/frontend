import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { debounce } from "../../../common/util/debounce";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-password-field";
import type { BackupConfig } from "../../../data/backup";
import { updateBackupConfig } from "../../../data/backup";
import type { CloudStatus } from "../../../data/cloud";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import "./components/config/ha-backup-config-agents";
import "./components/config/ha-backup-config-data";
import type { BackupConfigData } from "./components/config/ha-backup-config-data";
import "./components/config/ha-backup-config-encryption-key";
import "./components/config/ha-backup-config-schedule";
import type { BackupConfigSchedule } from "./components/config/ha-backup-config-schedule";

@customElement("ha-config-backup-settings")
class HaConfigBackupSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus!: CloudStatus;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public config?: BackupConfig;

  @state() private _config?: BackupConfig;

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("config") && !this._config) {
      this._config = this.config;
    }
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._scrollTo();
  }

  private async _scrollTo() {
    const hash = window.location.hash.substring(1);
    if (hash === "locations") {
      // Wait for the addons to be loaded before scrolling because the height can change
      this.addEventListener("backup-addons-fetched", async () => {
        await nextRender();
        this._scrolltoHash(hash);
      });
      return;
    }
    this._scrolltoHash(hash);
  }

  private _scrolltoHash(hash: string) {
    const element = this.shadowRoot!.getElementById(hash);
    element?.scrollIntoView();
    history.replaceState(null, "", window.location.pathname);
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    return html`
      <hass-subpage
        back-path="/config/backup"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${"Automatic backups"}
      >
        <div class="content">
          <ha-card id="schedule">
            <div class="card-header">Automatic backups</div>
            <div class="card-content">
              <p>
                Let Home Assistant take care of your backups by creating a
                scheduled backup that also removes older backups.
              </p>
              <ha-backup-config-schedule
                .hass=${this.hass}
                .value=${this._config}
                @value-changed=${this._scheduleConfigChanged}
              ></ha-backup-config-schedule>
            </div>
          </ha-card>
          <ha-card id="data">
            <div class="card-header">Backup data</div>
            <div class="card-content">
              <ha-backup-config-data
                .hass=${this.hass}
                .value=${this._dataConfig}
                @value-changed=${this._dataConfigChanged}
                force-home-assistant
                hide-addon-version
              ></ha-backup-config-data>
            </div>
          </ha-card>

          <ha-card class="agents" id="locations">
            <div class="card-header">Locations</div>
            <div class="card-content">
              <p>
                Your backup will be stored on these locations when this default
                backup is created. You can use all locations for custom backups.
              </p>
              <ha-backup-config-agents
                .hass=${this.hass}
                .value=${this._config.create_backup.agent_ids}
                .cloudStatus=${this.cloudStatus}
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
                .value=${this._config.create_backup.password}
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
    this._config = {
      ...this._config!,
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
    } = this._config!.create_backup;

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
    this._config = {
      ...this._config!,
      create_backup: {
        ...this.config!.create_backup,
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
    this._config = {
      ...this._config!,
      create_backup: {
        ...this._config!.create_backup,
        agent_ids: agents,
      },
    };
    this._debounceSave();
  }

  private _encryptionKeyChanged(ev) {
    const password = ev.detail.value as string;
    this._config = {
      ...this._config!,
      create_backup: {
        ...this._config!.create_backup,
        password: password,
      },
    };
    this._debounceSave();
  }

  private _debounceSave = debounce(() => this._save(), 500);

  private async _save() {
    await updateBackupConfig(this.hass, {
      create_backup: {
        agent_ids: this._config!.create_backup.agent_ids,
        include_folders: this._config!.create_backup.include_folders ?? [],
        include_database: this._config!.create_backup.include_database,
        include_addons: this._config!.create_backup.include_addons ?? [],
        include_all_addons: this._config!.create_backup.include_all_addons,
        password: this._config!.create_backup.password,
      },
      retention: this._config!.retention,
      schedule: this._config!.schedule.state,
    });
    fireEvent(this, "ha-refresh-backup-config");
  }

  static styles = css`
    ha-card {
      scroll-margin-top: 16px;
    }
    .content {
      padding: 28px 20px 0;
      max-width: 690px;
      margin: 0 auto;
      gap: 24px;
      display: flex;
      flex-direction: column;
      margin-bottom: 24px;
    }
    .alert {
      --mdc-theme-primary: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-settings": HaConfigBackupSettings;
  }
}
