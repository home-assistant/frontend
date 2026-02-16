import {
  mdiAlertCircle,
  mdiCheckCircle,
  mdiCogOutline,
  mdiFolderMultipleOutline,
  mdiLan,
  mdiPencil,
  mdiPlus,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-form/ha-form";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-select";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-switch";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { getConfigEntries } from "../../../../../data/config_entries";
import type {
  ZHAConfiguration,
  ZHANetworkBackupAndMetadata,
  ZHANetworkSettings,
} from "../../../../../data/zha";
import {
  createZHANetworkBackup,
  fetchDevices,
  fetchZHAConfiguration,
  fetchZHANetworkSettings,
  updateZHAConfiguration,
} from "../../../../../data/zha";
import { showOptionsFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-options-flow";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { fileDownload } from "../../../../../util/file_download";
import "../../../ha-config-section";
import { showZHAChangeChannelDialog } from "./show-dialog-zha-change-channel";

const MULTIPROTOCOL_ADDON_URL = "socket://core-silabs-multiprotocol:9999";

const PREDEFINED_TIMEOUTS = [1800, 3600, 7200, 21600, 43200, 86400];

export const zhaTabs: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.zha.network.caption",
    path: `/config/zha/dashboard`,
    iconPath: mdiCogOutline,
  },
  {
    translationKey: "ui.panel.config.zha.groups.caption",
    path: `/config/zha/groups`,
    iconPath: mdiFolderMultipleOutline,
  },
  {
    translationKey: "ui.panel.config.zha.visualization.caption",
    path: `/config/zha/visualization`,
    iconPath: mdiLan,
  },
];

@customElement("zha-config-dashboard")
class ZHAConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _configEntry?: ConfigEntry;

  @state() private _configuration?: ZHAConfiguration;

  @state() private _networkSettings?: ZHANetworkSettings;

  @state() private _totalDevices = 0;

  @state() private _offlineDevices = 0;

  @state() private _error?: string;

  @state() private _generatingBackup = false;

  @state() private _customMains = false;

  @state() private _customBattery = false;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this.hass.loadBackendTranslation("config_panel", "zha", false);
      this._fetchConfigEntry();
      this._fetchConfiguration();
      this._fetchSettings();
      this._fetchDevicesAndUpdateStatus();
    }
  }

  private _getUnavailableTimeoutOptions(defaultSeconds: number) {
    const defaultSuffix = ` (${this.hass.localize("ui.panel.config.zha.configuration_page.timeout_default")})`;
    return [
      {
        value: "1800",
        label:
          this.hass.localize(
            "ui.panel.config.zha.configuration_page.timeout_30_min"
          ) + (defaultSeconds === 1800 ? defaultSuffix : ""),
      },
      {
        value: "3600",
        label:
          this.hass.localize(
            "ui.panel.config.zha.configuration_page.timeout_1_hour"
          ) + (defaultSeconds === 3600 ? defaultSuffix : ""),
      },
      {
        value: "7200",
        label:
          this.hass.localize(
            "ui.panel.config.zha.configuration_page.timeout_2_hours"
          ) + (defaultSeconds === 7200 ? defaultSuffix : ""),
      },
      {
        value: "21600",
        label:
          this.hass.localize(
            "ui.panel.config.zha.configuration_page.timeout_6_hours"
          ) + (defaultSeconds === 21600 ? defaultSuffix : ""),
      },
      {
        value: "43200",
        label:
          this.hass.localize(
            "ui.panel.config.zha.configuration_page.timeout_12_hours"
          ) + (defaultSeconds === 43200 ? defaultSuffix : ""),
      },
      {
        value: "86400",
        label:
          this.hass.localize(
            "ui.panel.config.zha.configuration_page.timeout_24_hours"
          ) + (defaultSeconds === 86400 ? defaultSuffix : ""),
      },
      {
        value: "custom",
        label: this.hass.localize(
          "ui.panel.config.zha.configuration_page.timeout_custom"
        ),
      },
    ];
  }

  protected render(): TemplateResult {
    const deviceOnline =
      this._offlineDevices < this._totalDevices || this._totalDevices === 0;
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${zhaTabs}
        back-path="/config"
        has-fab
      >
        <div class="container">
          ${this._renderNetworkStatus(deviceOnline)} ${this._renderLightCard()}
          ${this._renderStateCard()} ${this._renderNetworkInfoCard()}
          ${this._renderBackupCard()} ${this._renderDynamicCards()}
        </div>

        <a href="/config/zha/add" slot="fab">
          <ha-fab
            .label=${this.hass.localize("ui.panel.config.zha.add_device")}
            extended
          >
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
          </ha-fab>
        </a>
      </hass-tabs-subpage>
    `;
  }

  private _renderNetworkStatus(deviceOnline: boolean) {
    return html`
      <ha-card class="content network-status">
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <div class="card-content">
          <div class="heading">
            <div class="icon">
              <ha-svg-icon
                .path=${deviceOnline ? mdiCheckCircle : mdiAlertCircle}
                class=${deviceOnline ? "online" : "offline"}
              ></ha-svg-icon>
            </div>
            <div class="details">
              Zigbee
              ${this.hass.localize(
                `ui.panel.config.zha.configuration_page.status_${deviceOnline ? "online" : "offline"}`
              )}<br />
              <small>
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.devices",
                  { count: this._totalDevices }
                )}
              </small>
              <small class="offline">
                ${this._offlineDevices > 0
                  ? html`(${this.hass.localize(
                      "ui.panel.config.zha.configuration_page.devices_offline",
                      { count: this._offlineDevices }
                    )})`
                  : nothing}
              </small>
            </div>
          </div>
        </div>
        <div class="card-actions">
          <ha-button
            href=${`/config/devices/dashboard?historyBack=1&config_entry=${this._configEntry?.entry_id}`}
            appearance="plain"
            size="small"
          >
            ${this.hass.localize("ui.panel.config.devices.caption")}</ha-button
          >
          <ha-button
            appearance="plain"
            size="small"
            href=${`/config/entities/dashboard?historyBack=1&config_entry=${this._configEntry?.entry_id}`}
          >
            ${this.hass.localize("ui.panel.config.entities.caption")}</ha-button
          >
        </div>
      </ha-card>
    `;
  }

  private _renderLightCard() {
    const data = this._configuration?.data.zha_options;
    const transitionValue = (data?.default_light_transition as number) ?? 0;
    return html`
      <ha-card
        header=${this.hass.localize(
          "ui.panel.config.zha.configuration_page.light_card_title"
        )}
      >
        ${this._configuration
          ? html`
              <ha-md-list>
                <ha-md-list-item>
                  <span slot="headline"
                    >${this.hass.localize(
                      "ui.panel.config.zha.configuration_page.default_light_transition_label"
                    )}</span
                  >
                  <span slot="supporting-text"
                    >${this.hass.localize(
                      "ui.panel.config.zha.configuration_page.default_light_transition_description"
                    )}</span
                  >
                  <ha-textfield
                    slot="end"
                    type="number"
                    .value=${String(transitionValue)}
                    .suffix=${"s"}
                    .min=${0}
                    .step=${0.5}
                    @change=${this._defaultLightTransitionChanged}
                  ></ha-textfield>
                </ha-md-list-item>
                <ha-md-list-item>
                  <span slot="headline"
                    >${this.hass.localize(
                      "ui.panel.config.zha.configuration_page.enhanced_light_transition_label"
                    )}</span
                  >
                  <span slot="supporting-text"
                    >${this.hass.localize(
                      "ui.panel.config.zha.configuration_page.enhanced_light_transition_description"
                    )}</span
                  >
                  <ha-switch
                    slot="end"
                    .checked=${(data?.enhanced_light_transition as boolean) ??
                    false}
                    @change=${this._enhancedLightTransitionChanged}
                  ></ha-switch>
                </ha-md-list-item>
                <ha-md-list-item>
                  <span slot="headline"
                    >${this.hass.localize(
                      "ui.panel.config.zha.configuration_page.light_transitioning_flag_label"
                    )}</span
                  >
                  <span slot="supporting-text"
                    >${this.hass.localize(
                      "ui.panel.config.zha.configuration_page.light_transitioning_flag_description"
                    )}</span
                  >
                  <ha-switch
                    slot="end"
                    .checked=${(data?.light_transitioning_flag as boolean) ??
                    true}
                    @change=${this._lightTransitioningFlagChanged}
                  ></ha-switch>
                </ha-md-list-item>
              </ha-md-list>
            `
          : nothing}
      </ha-card>
    `;
  }

  private _renderStateCard() {
    const data = this._configuration?.data.zha_options;
    return html`
      <ha-card
        header=${this.hass.localize(
          "ui.panel.config.zha.configuration_page.state_card_title"
        )}
      >
        ${this._configuration
          ? html`<ha-md-list>
              <ha-md-list-item>
                <span slot="headline"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.enable_identify_on_join_label"
                  )}</span
                >
                <span slot="supporting-text"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.enable_identify_on_join_description"
                  )}</span
                >
                <ha-switch
                  slot="end"
                  .checked=${(data?.enable_identify_on_join as boolean) ?? true}
                  @change=${this._enableIdentifyOnJoinChanged}
                ></ha-switch>
              </ha-md-list-item>
              <ha-md-list-item>
                <span slot="headline"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.group_members_assume_state_label"
                  )}</span
                >
                <span slot="supporting-text"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.group_members_assume_state_description"
                  )}</span
                >
                <ha-switch
                  slot="end"
                  .checked=${(data?.group_members_assume_state as boolean) ??
                  true}
                  @change=${this._groupMembersAssumeStateChanged}
                ></ha-switch>
              </ha-md-list-item>
              <ha-md-list-item>
                <span slot="headline"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.consider_unavailable_mains_label"
                  )}</span
                >
                <span slot="supporting-text"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.consider_unavailable_mains_description"
                  )}</span
                >
                <ha-select
                  slot="end"
                  .value=${this._getUnavailableDropdownValue(
                    data?.consider_unavailable_mains,
                    this._customMains
                  )}
                  .options=${this._getUnavailableTimeoutOptions(7200)}
                  @selected=${this._mainsUnavailableChanged}
                ></ha-select>
              </ha-md-list-item>
              ${this._customMains
                ? html`
                    <ha-md-list-item>
                      <ha-textfield
                        slot="end"
                        type="number"
                        .value=${String(
                          (data?.consider_unavailable_mains as number) ?? 7200
                        )}
                        .suffix=${"s"}
                        .min=${1}
                        .step=${1}
                        @change=${this._customMainsSecondsChanged}
                      ></ha-textfield>
                    </ha-md-list-item>
                  `
                : nothing}
              <ha-md-list-item>
                <span slot="headline"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.consider_unavailable_battery_label"
                  )}</span
                >
                <span slot="supporting-text"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.consider_unavailable_battery_description"
                  )}</span
                >
                <ha-select
                  slot="end"
                  .value=${this._getUnavailableDropdownValue(
                    data?.consider_unavailable_battery,
                    this._customBattery
                  )}
                  .options=${this._getUnavailableTimeoutOptions(21600)}
                  @selected=${this._batteryUnavailableChanged}
                ></ha-select>
              </ha-md-list-item>
              ${this._customBattery
                ? html`
                    <ha-md-list-item>
                      <ha-textfield
                        slot="end"
                        type="number"
                        .value=${String(
                          (data?.consider_unavailable_battery as number) ??
                            21600
                        )}
                        .suffix=${"s"}
                        .min=${1}
                        .step=${1}
                        @change=${this._customBatterySecondsChanged}
                      ></ha-textfield>
                    </ha-md-list-item>
                  `
                : nothing}
              <ha-md-list-item>
                <span slot="headline"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.enable_mains_startup_polling_label"
                  )}</span
                >
                <span slot="supporting-text"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.enable_mains_startup_polling_description"
                  )}</span
                >
                <ha-switch
                  slot="end"
                  .checked=${(data?.enable_mains_startup_polling as boolean) ??
                  true}
                  @change=${this._enableMainsStartupPollingChanged}
                ></ha-switch>
              </ha-md-list-item>
            </ha-md-list>`
          : nothing}
      </ha-card>
    `;
  }

  private _renderNetworkInfoCard() {
    return html`
      <ha-card
        header=${this.hass.localize(
          "ui.panel.config.zha.configuration_page.network_info_title"
        )}
      >
        ${this._networkSettings
          ? html`<ha-md-list class="network-info">
              <ha-md-list-item>
                <span slot="headline"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.channel_label"
                  )}</span
                >
                <span slot="supporting-text"
                  >${this._networkSettings.settings.network_info.channel}</span
                >
                <ha-icon-button
                  slot="end"
                  .label=${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.change_channel"
                  )}
                  .path=${mdiPencil}
                  @click=${this._showChannelMigrationDialog}
                ></ha-icon-button>
              </ha-md-list-item>
              <ha-md-list-item>
                <span slot="headline">PAN ID</span>
                <span slot="supporting-text"
                  >${this._networkSettings.settings.network_info.pan_id}</span
                >
              </ha-md-list-item>
              <ha-md-list-item>
                <span slot="headline">Extended PAN ID</span>
                <span slot="supporting-text"
                  >${this._networkSettings.settings.network_info
                    .extended_pan_id}</span
                >
              </ha-md-list-item>
              <ha-md-list-item>
                <span slot="headline">Coordinator IEEE</span>
                <span slot="supporting-text"
                  >${this._networkSettings.settings.node_info.ieee}</span
                >
              </ha-md-list-item>
              <ha-md-list-item>
                <span slot="headline"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.radio_type"
                  )}</span
                >
                <span slot="supporting-text"
                  >${this._networkSettings.radio_type}</span
                >
              </ha-md-list-item>
              <ha-md-list-item>
                <span slot="headline"
                  >${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.serial_port"
                  )}</span
                >
                <span slot="supporting-text"
                  >${this._networkSettings.device.path}</span
                >
              </ha-md-list-item>
              ${this._networkSettings.device.baudrate &&
              !this._networkSettings.device.path.startsWith("socket://")
                ? html`
                    <ha-md-list-item>
                      <span slot="headline"
                        >${this.hass.localize(
                          "ui.panel.config.zha.configuration_page.baudrate"
                        )}</span
                      >
                      <span slot="supporting-text"
                        >${this._networkSettings.device.baudrate}</span
                      >
                    </ha-md-list-item>
                  `
                : nothing}
            </ha-md-list>`
          : nothing}
      </ha-card>
    `;
  }

  private _renderBackupCard() {
    return html`
      <ha-card
        header=${this.hass.localize(
          "ui.panel.config.zha.configuration_page.backup_restore_title"
        )}
      >
        <div class="card-content">
          <p>
            ${this.hass.localize(
              "ui.panel.config.zha.configuration_page.backup_restore_description"
            )}
          </p>
        </div>
        <div class="card-actions backup-actions">
          <ha-progress-button
            appearance="plain"
            @click=${this._createAndDownloadBackup}
            .progress=${this._generatingBackup}
            .disabled=${!this._networkSettings || this._generatingBackup}
          >
            ${this.hass.localize(
              "ui.panel.config.zha.configuration_page.download_backup"
            )}
          </ha-progress-button>
          <ha-button
            appearance="filled"
            variant="brand"
            @click=${this._openOptionFlow}
          >
            ${this.hass.localize(
              "ui.panel.config.zha.configuration_page.migrate_radio"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _renderDynamicCards() {
    if (!this._configuration) {
      return nothing;
    }
    return html`
      ${Object.entries(this._configuration.schemas)
        .filter(([section]) => section !== "zha_options")
        .map(
          ([section, schema]) =>
            html`<ha-card
              header=${this.hass.localize(
                `component.zha.config_panel.${section}.title`
              )}
            >
              <div class="card-content">
                <ha-form
                  .hass=${this.hass}
                  .schema=${schema}
                  .data=${this._configuration!.data[section]}
                  @value-changed=${this._dynamicDataChanged}
                  .section=${section}
                  .computeLabel=${this._computeLabelCallback(
                    this.hass.localize,
                    section
                  )}
                ></ha-form>
              </div>
              <div class="card-actions">
                <ha-progress-button
                  appearance="filled"
                  variant="brand"
                  @click=${this._updateDynamicConfiguration}
                >
                  ${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.update_button"
                  )}
                </ha-progress-button>
              </div>
            </ha-card>`
        )}
    `;
  }

  private async _fetchConfigEntry(): Promise<void> {
    const configEntries = await getConfigEntries(this.hass, {
      domain: "zha",
    });
    this._configEntry = configEntries.find(
      (entry) => entry.disabled_by === null && entry.source !== "ignore"
    );
  }

  private async _fetchConfiguration(): Promise<void> {
    this._configuration = await fetchZHAConfiguration(this.hass!);
    const mainsValue = this._configuration.data.zha_options
      ?.consider_unavailable_mains as number | undefined;
    const batteryValue = this._configuration.data.zha_options
      ?.consider_unavailable_battery as number | undefined;
    this._customMains =
      mainsValue !== undefined && !PREDEFINED_TIMEOUTS.includes(mainsValue);
    this._customBattery =
      batteryValue !== undefined && !PREDEFINED_TIMEOUTS.includes(batteryValue);
  }

  private async _fetchSettings(): Promise<void> {
    this._networkSettings = await fetchZHANetworkSettings(this.hass!);
  }

  private async _fetchDevicesAndUpdateStatus(): Promise<void> {
    try {
      const devices = await fetchDevices(this.hass);
      this._totalDevices = devices.length;
      this._offlineDevices =
        this._totalDevices - devices.filter((d) => d.available).length;
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  private _getUnavailableDropdownValue(
    seconds: unknown,
    isCustom: boolean
  ): string {
    if (isCustom) {
      return "custom";
    }
    const value = (seconds as number) ?? 7200;
    if (PREDEFINED_TIMEOUTS.includes(value)) {
      return String(value);
    }
    return "custom";
  }

  // --- Toggle handlers ---

  private _groupMembersAssumeStateChanged(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this._configuration!.data.zha_options.group_members_assume_state = checked;
    this._saveConfiguration();
  }

  private _enableIdentifyOnJoinChanged(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this._configuration!.data.zha_options.enable_identify_on_join = checked;
    this._saveConfiguration();
  }

  private _enhancedLightTransitionChanged(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this._configuration!.data.zha_options.enhanced_light_transition = checked;
    this._saveConfiguration();
  }

  private _lightTransitioningFlagChanged(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this._configuration!.data.zha_options.light_transitioning_flag = checked;
    this._saveConfiguration();
  }

  private _enableMainsStartupPollingChanged(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this._configuration!.data.zha_options.enable_mains_startup_polling =
      checked;
    this._saveConfiguration();
  }

  // --- Slider handlers ---

  private _defaultLightTransitionChanged(ev: Event): void {
    const value = Number((ev.target as HTMLInputElement).value);
    this._configuration!.data.zha_options.default_light_transition = value;
    this.requestUpdate();
    this._saveConfiguration();
  }

  private _customMainsSecondsChanged(ev: Event): void {
    const seconds = Number((ev.target as HTMLInputElement).value);
    this._configuration!.data.zha_options.consider_unavailable_mains = seconds;
    this.requestUpdate();
    this._saveConfiguration();
  }

  private _customBatterySecondsChanged(ev: Event): void {
    const seconds = Number((ev.target as HTMLInputElement).value);
    this._configuration!.data.zha_options.consider_unavailable_battery =
      seconds;
    this.requestUpdate();
    this._saveConfiguration();
  }

  // --- Select handlers ---

  private _mainsUnavailableChanged(ev: HaSelectSelectEvent): void {
    const value = ev.detail.value;
    if (!value) {
      return;
    }
    const currentValue = this._getUnavailableDropdownValue(
      this._configuration!.data.zha_options.consider_unavailable_mains,
      this._customMains
    );
    if (value === currentValue) {
      return;
    }
    if (value === "custom") {
      this._customMains = true;
    } else {
      this._customMains = false;
      this._configuration!.data.zha_options.consider_unavailable_mains =
        Number(value);
      this._saveConfiguration();
    }
    this.requestUpdate();
  }

  private _batteryUnavailableChanged(ev: HaSelectSelectEvent): void {
    const value = ev.detail.value;
    if (!value) {
      return;
    }
    const currentValue = this._getUnavailableDropdownValue(
      this._configuration!.data.zha_options.consider_unavailable_battery,
      this._customBattery
    );
    if (value === currentValue) {
      return;
    }
    if (value === "custom") {
      this._customBattery = true;
    } else {
      this._customBattery = false;
      this._configuration!.data.zha_options.consider_unavailable_battery =
        Number(value);
      this._saveConfiguration();
    }
    this.requestUpdate();
  }

  // --- Save ---

  private async _saveConfiguration(): Promise<void> {
    try {
      await updateZHAConfiguration(this.hass!, this._configuration!.data);
    } catch (err: any) {
      showAlertDialog(this, { text: err.message });
    }
  }

  // --- Channel dialog ---

  private async _showChannelMigrationDialog(): Promise<void> {
    if (this._networkSettings!.device.path === MULTIPROTOCOL_ADDON_URL) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zha.configuration_page.channel_dialog.title"
        ),
        text: this.hass.localize(
          "ui.panel.config.zha.configuration_page.channel_dialog.text"
        ),
        warning: true,
      });
      return;
    }

    showZHAChangeChannelDialog(this, {
      currentChannel: this._networkSettings!.settings.network_info.channel,
    });
  }

  // --- Backup ---

  private async _createAndDownloadBackup(): Promise<void> {
    let backup_and_metadata: ZHANetworkBackupAndMetadata;

    this._generatingBackup = true;

    try {
      backup_and_metadata = await createZHANetworkBackup(this.hass!);
    } catch (err: any) {
      showAlertDialog(this, {
        title: "Failed to create backup",
        text: err.message,
        warning: true,
      });
      return;
    } finally {
      this._generatingBackup = false;
    }

    if (!backup_and_metadata.is_complete) {
      await showAlertDialog(this, {
        title: "Backup is incomplete",
        text: "A backup has been created but it is incomplete and cannot be restored. This is a coordinator firmware limitation.",
      });
    }

    const backupJSON: string =
      "data:text/plain;charset=utf-8," +
      encodeURIComponent(JSON.stringify(backup_and_metadata.backup, null, 4));
    const backupTime: Date = new Date(
      Date.parse(backup_and_metadata.backup.backup_time)
    );
    let basename = `ZHA backup ${backupTime.toISOString().replace(/:/g, "-")}`;

    if (!backup_and_metadata.is_complete) {
      basename = `Incomplete ${basename}`;
    }

    fileDownload(backupJSON, `${basename}.json`);
  }

  private _openOptionFlow() {
    if (!this._configEntry) {
      return;
    }
    showOptionsFlowDialog(this, this._configEntry);
  }

  // --- Dynamic card handlers (for alarm options etc.) ---

  private _dynamicDataChanged(ev) {
    this._configuration!.data[ev.currentTarget!.section] = ev.detail.value;
  }

  private async _updateDynamicConfiguration(ev: Event): Promise<void> {
    const button = ev.currentTarget as HTMLElement & {
      progress: boolean;
      actionSuccess: () => void;
      actionError: () => void;
    };
    button.progress = true;
    try {
      await updateZHAConfiguration(this.hass!, this._configuration!.data);
      button.actionSuccess();
    } catch (_err: any) {
      button.actionError();
    } finally {
      button.progress = false;
    }
  }

  private _computeLabelCallback(localize, section: string) {
    return (schema) =>
      localize(`component.zha.config_panel.${section}.${schema.name}`) ||
      schema.name;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          margin: auto;
          margin-top: var(--ha-space-4);
          max-width: 600px;
        }

        ha-card .card-actions {
          display: flex;
          justify-content: flex-end;
        }

        ha-card .backup-actions {
          justify-content: space-between;
        }

        .content {
          margin-top: var(--ha-space-6);
        }

        ha-md-list {
          background: none;
          padding: 0;
        }

        ha-md-list-item {
          --md-item-overflow: visible;
        }

        .network-info ha-md-list-item {
          --md-list-item-supporting-text-size: var(
            --md-list-item-label-text-size,
            var(--md-sys-typescale-body-large-size, 1rem)
          );
        }

        ha-select,
        ha-textfield {
          min-width: 210px;
        }

        @media all and (max-width: 450px) {
          ha-select,
          ha-textfield {
            min-width: 160px;
            width: 160px;
          }
        }

        .network-status div.heading {
          display: flex;
          align-items: center;
        }

        .network-status div.heading .icon {
          margin-inline-end: var(--ha-space-4);
        }

        .network-status div.heading ha-svg-icon {
          --mdc-icon-size: var(--ha-space-12);
        }

        .network-status div.heading .details {
          font-size: var(--ha-font-size-xl);
        }

        .network-status small {
          font-size: var(--ha-font-size-m);
        }

        .network-status small.offline {
          color: var(--secondary-text-color);
        }

        .network-status .online {
          color: var(--state-on-color, var(--success-color));
        }

        .network-status .offline {
          color: var(--error-color, var(--error-color));
        }

        .container {
          padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-dashboard": ZHAConfigDashboard;
  }
}
