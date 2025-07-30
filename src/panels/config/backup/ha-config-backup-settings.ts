import { mdiDotsVertical, mdiHarddisk, mdiOpenInNew } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { debounce } from "../../../common/util/debounce";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import "../../../components/ha-password-field";
import "../../../components/ha-svg-icon";
import type { BackupAgent, BackupConfig } from "../../../data/backup";
import { updateBackupConfig } from "../../../data/backup";
import type { CloudStatus } from "../../../data/cloud";
import {
  getSupervisorUpdateConfig,
  updateSupervisorUpdateConfig,
  type SupervisorUpdateConfig,
} from "../../../data/supervisor/update";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "./components/config/ha-backup-config-addon";
import "./components/config/ha-backup-config-agents";
import "./components/config/ha-backup-config-data";
import type { BackupConfigData } from "./components/config/ha-backup-config-data";
import "./components/config/ha-backup-config-encryption-key";
import "./components/config/ha-backup-config-schedule";
import type { BackupConfigSchedule } from "./components/config/ha-backup-config-schedule";
import { showLocalBackupLocationDialog } from "./dialogs/show-dialog-local-backup-location";
import { brandsUrl } from "../../../util/brands-url";

@customElement("ha-config-backup-settings")
class HaConfigBackupSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public config?: BackupConfig;

  @property({ attribute: false }) public agents: BackupAgent[] = [];

  @state() private _config?: BackupConfig;

  @state() private _supervisorUpdateConfig?: SupervisorUpdateConfig;

  @state() private _supervisorUpdateConfigError?: string;

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("config") && !this._config) {
      this._config = this.config;
    }

    if (!this.hasUpdated && isComponentLoaded(this.hass, "hassio")) {
      this._getSupervisorUpdateConfig();
    }
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._scrollToSection();
    // Update config the page is displayed (e.g. when coming back from a location detail page)
    this._config = this.config;
  }

  private async _getSupervisorUpdateConfig() {
    try {
      this._supervisorUpdateConfig = await getSupervisorUpdateConfig(this.hass);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      this._supervisorUpdateConfigError = this.hass.localize(
        "ui.panel.config.backup.settings.addon_update_backup.error_load",
        {
          error: err?.message || err,
        }
      );
    }
  }

  private async _scrollToSection() {
    const hash = window.location.hash.substring(1);
    if (
      hash === "locations" &&
      isComponentLoaded(this.hass, "hassio") &&
      !this._config?.create_backup.include_all_addons &&
      this._config?.create_backup.include_addons?.length
    ) {
      // Wait for the addons to be loaded before scrolling because the height can change and location section is below addons.
      this.addEventListener("backup-addons-fetched", async () => {
        await nextRender();
        this._scrolltoHash();
      });
      // Clear hash to cancel the scroll after 500ms if addons doesn't load
      setTimeout(() => {
        this._clearHash();
      }, 500);
      return;
    }
    await nextRender();
    this._scrolltoHash();
  }

  private _scrolltoHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const element = this.shadowRoot!.getElementById(hash);
      element?.scrollIntoView();
      this._clearHash();
    }
  }

  private _clearHash() {
    history.replaceState(null, "", window.location.pathname);
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const supervisor = isComponentLoaded(this.hass, "hassio");

    return html`
      <hass-subpage
        back-path="/config/backup"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.backup.settings.header")}
      >
        ${supervisor
          ? html`
              <ha-button-menu slot="toolbar-icon">
                <ha-icon-button
                  slot="trigger"
                  .label=${this.hass.localize("ui.common.menu")}
                  .path=${mdiDotsVertical}
                ></ha-icon-button>
                <ha-list-item
                  graphic="icon"
                  @request-selected=${this._changeLocalLocation}
                >
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiHarddisk}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.backup.settings.menu.change_default_location"
                  )}
                </ha-list-item>
              </ha-button-menu>
            `
          : nothing}

        <div class="content">
          <ha-card id="schedule">
            <div class="card-header">
              ${this.hass.localize(
                "ui.panel.config.backup.settings.schedule.title"
              )}
            </div>
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.backup.settings.schedule.description"
                )}
              </p>
              ${this._supervisorUpdateConfigError
                ? html`<ha-alert alert-type="error">
                    ${this._supervisorUpdateConfigError}
                  </ha-alert>`
                : nothing}
              <ha-backup-config-schedule
                .hass=${this.hass}
                .value=${this._config}
                .supervisor=${supervisor}
                .supervisorUpdateConfig=${this._supervisorUpdateConfig}
                @update-config-changed=${this._supervisorUpdateConfigChanged}
                @value-changed=${this._scheduleConfigChanged}
              ></ha-backup-config-schedule>
            </div>
          </ha-card>
          <ha-card id="data">
            <div class="card-header">
              ${this.hass.localize(
                "ui.panel.config.backup.settings.data.title"
              )}
            </div>
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
            <div class="card-header">
              ${this.hass.localize(
                "ui.panel.config.backup.settings.locations.title"
              )}
            </div>
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.backup.settings.locations.description"
                )}
              </p>
              <ha-backup-config-agents
                .hass=${this.hass}
                .value=${this._config.create_backup.agent_ids}
                .agentsConfig=${this._config.agents}
                .cloudStatus=${this.cloudStatus}
                .agents=${this.agents}
                @value-changed=${this._agentsConfigChanged}
                show-settings
              ></ha-backup-config-agents>
              ${!this._config.create_backup.agent_ids.length
                ? html`
                    <ha-alert
                      alert-type="warning"
                      .title=${this.hass.localize(
                        "ui.panel.config.backup.settings.locations.no_location"
                      )}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.backup.settings.locations.no_location_description"
                      )}
                    </ha-alert>
                    <br />
                  `
                : nothing}
            </div>
            ${!this.cloudStatus?.logged_in
              ? html`<ha-card class="cloud-info">
                  <div class="cloud-header">
                    <img
                      .src=${brandsUrl({
                        domain: "cloud",
                        type: "icon",
                        useFallback: true,
                        darkOptimized: this.hass.themes?.darkMode,
                      })}
                      crossorigin="anonymous"
                      referrerpolicy="no-referrer"
                      alt="Nabu Casa logo"
                      slot="start"
                    />
                    <span
                      >${this.hass.localize(
                        "ui.panel.config.backup.settings.locations.ha_cloud_backup",
                        {
                          home_assistant_cloud: "Home Assistant Cloud",
                        }
                      )}</span
                    >
                  </div>
                  <div class="card-content">
                    ${this.hass.localize(
                      "ui.panel.config.backup.settings.locations.ha_cloud_description"
                    )}
                  </div>
                  <div class="card-actions">
                    <ha-button appearance="plain" href="/config/cloud/login">
                      ${this.hass.localize(
                        "ui.panel.config.voice_assistants.assistants.cloud.sign_in"
                      )}
                    </ha-button>
                    <ha-button href="/config/cloud/register">
                      ${this.hass.localize(
                        "ui.panel.config.voice_assistants.assistants.cloud.try_one_month"
                      )}
                    </ha-button>
                  </div>
                </ha-card>`
              : nothing}
            <div class="card-actions">
              <ha-button
                size="small"
                href=${documentationUrl(this.hass, "/integrations/#backup")}
                target="_blank"
                rel="noreferrer"
                appearance="plain"
              >
                <ha-svg-icon slot="start" .path=${mdiOpenInNew}></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.backup.settings.locations.more_locations"
                )}
              </ha-button>
              ${supervisor
                ? html`<ha-button
                    size="small"
                    appearance="plain"
                    href="/config/storage"
                  >
                    ${this.hass.localize(
                      "ui.panel.config.backup.settings.locations.manage_network_storage"
                    )}
                  </ha-button>`
                : nothing}
            </div>
          </ha-card>
          ${supervisor
            ? html`<ha-card>
                <div class="card-header">
                  ${this.hass.localize(
                    "ui.panel.config.backup.settings.addon_update_backup.title"
                  )}
                </div>
                <div class="card-content">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.backup.settings.addon_update_backup.description"
                    )}
                  </p>
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.backup.settings.addon_update_backup.local_only"
                    )}
                  </p>
                  ${this._supervisorUpdateConfigError
                    ? html`<ha-alert alert-type="error">
                        ${this._supervisorUpdateConfigError}
                      </ha-alert>`
                    : nothing}
                  <ha-backup-config-addon
                    .hass=${this.hass}
                    .supervisorUpdateConfig=${this._supervisorUpdateConfig}
                    @update-config-changed=${this
                      ._supervisorUpdateConfigChanged}
                  ></ha-backup-config-addon>
                </div>
              </ha-card>`
            : nothing}
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
                .value=${this._config.create_backup.password}
                @value-changed=${this._encryptionKeyChanged}
              ></ha-backup-config-encryption-key>
            </div>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private async _changeLocalLocation(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    showLocalBackupLocationDialog(this, {});
  }

  private async _supervisorUpdateConfigChanged(ev) {
    const config = ev.detail.value as SupervisorUpdateConfig;
    this._supervisorUpdateConfig = {
      ...this._supervisorUpdateConfig!,
      ...config,
    };
    this._debounceSaveSupervisorUpdateConfig();
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

  private _debounceSaveSupervisorUpdateConfig = debounce(
    () => this._saveSupervisorUpdateConfig(),
    500
  );

  private async _saveSupervisorUpdateConfig() {
    if (!this._supervisorUpdateConfig) {
      return;
    }
    try {
      await updateSupervisorUpdateConfig(
        this.hass,
        this._supervisorUpdateConfig
      );
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      this._supervisorUpdateConfigError = this.hass.localize(
        "ui.panel.config.backup.settings.addon_update_backup.error_save",
        {
          error: err?.message || err?.toString(),
        }
      );
    }
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
      schedule: this._config!.schedule,
    });
    fireEvent(this, "ha-refresh-backup-config");
  }

  static styles = css`
    ha-card {
      scroll-margin-top: 16px;
    }
    p {
      color: var(--secondary-text-color);
    }
    p.error {
      color: var(--error-color);
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
    .card-header {
      padding-bottom: 8px;
    }
    .card-content {
      padding-bottom: 0;
    }
    a {
      text-decoration: none;
    }
    .cloud-info {
      margin: 0 16px 16px;
    }
    .cloud-info .cloud-header {
      display: flex;
      gap: 16px;
      font-size: var(--ha-font-size-xl);
      align-items: center;
      padding: 16px;
    }
    .cloud-info .cloud-header img {
      width: 48px;
    }
    .cloud-info .card-content {
      padding-bottom: 16px;
    }
    .cloud-info .card-actions {
      display: flex;
      justify-content: space-between;
    }

    ha-button[size="small"] ha-svg-icon {
      --mdc-icon-size: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-settings": HaConfigBackupSettings;
  }
}
