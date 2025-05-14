import "@material/mwc-button/mwc-button";
import {
  mdiFolderMultipleOutline,
  mdiLan,
  mdiNetwork,
  mdiPlus,
  mdiPencil,
  mdiCheckCircle,
  mdiAlertCircle,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { getConfigEntries } from "../../../../../data/config_entries";
import "../../../../../components/ha-card";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-button";
import { fileDownload } from "../../../../../util/file_download";
import "../../../../../components/ha-icon-next";
import "../../../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { showOptionsFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-options-flow";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import "../../../../../components/ha-form/ha-form";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-settings-row";
import { showZHAChangeChannelDialog } from "./show-dialog-zha-change-channel";
import type {
  ZHAConfiguration,
  ZHANetworkSettings,
  ZHANetworkBackupAndMetadata,
} from "../../../../../data/zha";
import {
  fetchZHAConfiguration,
  updateZHAConfiguration,
  fetchZHANetworkSettings,
  createZHANetworkBackup,
  fetchDevices,
} from "../../../../../data/zha";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";

const MULTIPROTOCOL_ADDON_URL = "socket://core-silabs-multiprotocol:9999";

export const zhaTabs: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.zha.network.caption",
    path: `/config/zha/dashboard`,
    iconPath: mdiNetwork,
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

  @property({ attribute: false }) public configEntryId?: string;

  @state() private _configuration?: ZHAConfiguration;

  @state() private _networkSettings?: ZHANetworkSettings;

  @state() private _totalDevices = 0;

  @state() private _offlineDevices = 0;

  @state() private _error?: string;

  @state() private _generatingBackup = false;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this.hass.loadBackendTranslation("config_panel", "zha", false);
      this._fetchConfiguration();
      this._fetchSettings();
      this._fetchDevicesAndUpdateStatus();
    }
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
        back-path="/config/integrations"
      >
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
                ZHA
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.status_title"
                )}:
                ${this.hass.localize(
                  `ui.panel.config.zha.configuration_page.status_${deviceOnline ? "online" : "offline"}`
                )}<br />
                <small>
                  ${this.hass.localize(
                    "ui.panel.config.zha.configuration_page.devices",
                    { count: this._totalDevices }
                  )}
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
          ${this.configEntryId
            ? html`<div class="card-actions">
                <a
                  href=${`/config/devices/dashboard?historyBack=1&config_entry=${this.configEntryId}`}
                >
                  <mwc-button
                    >${this.hass.localize(
                      "ui.panel.config.devices.caption"
                    )}</mwc-button
                  >
                </a>
                <a
                  href=${`/config/entities/dashboard?historyBack=1&config_entry=${this.configEntryId}`}
                >
                  <mwc-button
                    >${this.hass.localize(
                      "ui.panel.config.entities.caption"
                    )}</mwc-button
                  >
                </a>
              </div>`
            : ""}
        </ha-card>
        <ha-card
          class="network-settings"
          header=${this.hass.localize(
            "ui.panel.config.zha.configuration_page.network_settings_title"
          )}
        >
          ${this._networkSettings
            ? html`<div class="card-content">
                <ha-settings-row>
                  <span slot="description">PAN ID</span>
                  <span slot="heading"
                    >${this._networkSettings.settings.network_info.pan_id}</span
                  >
                </ha-settings-row>

                <ha-settings-row>
                  <span slot="heading"
                    >${this._networkSettings.settings.network_info
                      .extended_pan_id}</span
                  >
                  <span slot="description">Extended PAN ID</span>
                </ha-settings-row>

                <ha-settings-row>
                  <span slot="description">Channel</span>
                  <span slot="heading"
                    >${this._networkSettings.settings.network_info
                      .channel}</span
                  >

                  <ha-icon-button
                    .label=${this.hass.localize(
                      "ui.panel.config.zha.configuration_page.change_channel"
                    )}
                    .path=${mdiPencil}
                    @click=${this._showChannelMigrationDialog}
                  >
                  </ha-icon-button>
                </ha-settings-row>

                <ha-settings-row>
                  <span slot="description">Coordinator IEEE</span>
                  <span slot="heading"
                    >${this._networkSettings.settings.node_info.ieee}</span
                  >
                </ha-settings-row>

                <ha-settings-row>
                  <span slot="description">Radio type</span>
                  <span slot="heading"
                    >${this._networkSettings.radio_type}</span
                  >
                </ha-settings-row>

                <ha-settings-row>
                  <span slot="description">Serial port</span>
                  <span slot="heading"
                    >${this._networkSettings.device.path}</span
                  >
                </ha-settings-row>

                ${this._networkSettings.device.baudrate &&
                !this._networkSettings.device.path.startsWith("socket://")
                  ? html`
                      <ha-settings-row>
                        <span slot="description">Baudrate</span>
                        <span slot="heading"
                          >${this._networkSettings.device.baudrate}</span
                        >
                      </ha-settings-row>
                    `
                  : ""}
              </div>`
            : ""}
          <div class="card-actions">
            <ha-progress-button
              @click=${this._createAndDownloadBackup}
              .progress=${this._generatingBackup}
              .disabled=${!this._networkSettings || this._generatingBackup}
            >
              ${this.hass.localize(
                "ui.panel.config.zha.configuration_page.download_backup"
              )}
            </ha-progress-button>
            <mwc-button class="warning" @click=${this._openOptionFlow}>
              ${this.hass.localize(
                "ui.panel.config.zha.configuration_page.migrate_radio"
              )}
            </mwc-button>
          </div>
        </ha-card>
        ${this._configuration
          ? Object.entries(this._configuration.schemas).map(
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
                      @value-changed=${this._dataChanged}
                      .section=${section}
                      .computeLabel=${this._computeLabelCallback(
                        this.hass.localize,
                        section
                      )}
                    ></ha-form>
                  </div>
                </ha-card>`
            )
          : ""}
        <ha-card>
          <div class="card-actions">
            <mwc-button @click=${this._updateConfiguration}>
              ${this.hass.localize(
                "ui.panel.config.zha.configuration_page.update_button"
              )}
            </mwc-button>
          </div>
        </ha-card>

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

  private async _fetchConfiguration(): Promise<void> {
    this._configuration = await fetchZHAConfiguration(this.hass!);
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
      this._totalDevices = 0;
      this._offlineDevices = 0;
      this._error = err.message || err;
    }
  }

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

  private async _openOptionFlow() {
    if (!this.configEntryId) {
      return;
    }

    const configEntries: ConfigEntry[] = await getConfigEntries(this.hass, {
      domain: "zha",
    });

    const configEntry = configEntries.find(
      (entry) => entry.entry_id === this.configEntryId
    );

    showOptionsFlowDialog(this, configEntry!);
  }

  private _dataChanged(ev) {
    this._configuration!.data[ev.currentTarget!.section] = ev.detail.value;
  }

  private async _updateConfiguration(): Promise<any> {
    await updateZHAConfiguration(this.hass!, this._configuration!.data);
  }

  private _computeLabelCallback(localize, section: string) {
    // Returns a callback for ha-form to calculate labels per schema object
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
          margin-top: 16px;
          max-width: 500px;
        }

        .network-settings ha-settings-row {
          padding-left: 0;
          padding-right: 0;
          padding-inline-start: 0;
          padding-inline-end: 0;
        }

        .network-settings ha-settings-row span[slot="heading"] {
          white-space: normal;
          word-break: break-all;
          text-indent: -1em;
          padding-left: 1em;
          padding-inline-start: 1em;
          padding-inline-end: initial;
        }

        .network-settings ha-settings-row ha-icon-button {
          margin-top: -16px;
          margin-bottom: -16px;
        }

        .content {
          margin-top: 24px;
        }

        .network-status div.heading {
          display: flex;
          align-items: center;
        }

        .network-status div.heading .icon {
          width: 48px;
          height: 48px;
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
        }

        .network-status div.heading ha-svg-icon {
          width: 48px;
          height: 48px;
        }

        .network-status div.heading .details {
          font-size: var(--ha-font-size-xl);
        }

        .network-status small {
          font-size: var(--ha-font-size-m);
        }

        .network-status .online {
          color: var(--state-on-color, var(--success-color));
        }

        .network-status .offline {
          color: var(--error-color, var(--error-color));
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
