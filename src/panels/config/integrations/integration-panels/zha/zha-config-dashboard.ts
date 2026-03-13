import {
  mdiAlertCircleOutline,
  mdiCheck,
  mdiDevices,
  mdiDownload,
  mdiFolderMultipleOutline,
  mdiInformationOutline,
  mdiPlus,
  mdiShape,
  mdiTune,
  mdiVectorPolyline,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { animationStyles } from "../../../../../resources/theme/animations.globals";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import type { ConfigEntry } from "../../../../../data/config_entries";
import { getConfigEntries } from "../../../../../data/config_entries";
import type {
  ZHAConfiguration,
  ZHANetworkBackupAndMetadata,
} from "../../../../../data/zha";
import {
  createZHANetworkBackup,
  fetchDevices,
  fetchGroups,
  fetchZHAConfiguration,
} from "../../../../../data/zha";
import { showOptionsFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-options-flow";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";
import { fileDownload } from "../../../../../util/file_download";

@customElement("zha-config-dashboard")
class ZHAConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _configEntry?: ConfigEntry;

  @state() private _configuration?: ZHAConfiguration;

  @state() private _offlineDevices = 0;

  @state() private _totalGroups?: number;

  @state() private _asyncDataLoaded = false;

  @state() private _error?: string;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this.hass.loadBackendTranslation("config_panel", "zha", false);
      this._fetchConfigEntry();
      this._fetchConfiguration();
      this._fetchDevicesAndGroups();
    }
  }

  protected render(): TemplateResult {
    const deviceIds = new Set<string>();
    let entityCount = 0;
    for (const entity of Object.values(this.hass.entities)) {
      if (entity.platform === "zha") {
        entityCount++;
        if (entity.device_id) {
          deviceIds.add(entity.device_id);
        }
      }
    }
    const deviceOnline =
      this._offlineDevices < deviceIds.size || deviceIds.size === 0;
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.zha.network.caption")}
        back-path="/config"
        has-fab
      >
        <div class="container">
          ${this._renderNetworkStatus(deviceOnline, deviceIds.size)}
          ${this._renderMyNetworkCard(deviceIds, entityCount)}
          ${this._renderNavigationCard()} ${this._renderBackupCard()}
        </div>

        <a href="/config/zha/add" slot="fab">
          <ha-fab
            .label=${this.hass.localize("ui.panel.config.zha.add_device")}
            extended
          >
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
          </ha-fab>
        </a>
      </hass-subpage>
    `;
  }

  private _renderNetworkStatus(deviceOnline: boolean, totalDevices: number) {
    return html`
      <ha-card class="content network-status">
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <div class="card-content">
          <div class="heading">
            <div class="icon ${deviceOnline ? "success" : "error"}">
              <ha-svg-icon
                .path=${deviceOnline ? mdiCheck : mdiAlertCircleOutline}
              ></ha-svg-icon>
            </div>
            <div class="details">
              ${this.hass.localize(
                `ui.panel.config.zha.configuration_page.status_${deviceOnline ? "online" : "offline"}`
              )}<br />
              <small>
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.devices",
                  { count: totalDevices }
                )}
              </small>
              <small class="offline">
                ${this._asyncDataLoaded && this._offlineDevices > 0
                  ? html`(${this.hass.localize(
                      "ui.panel.config.zha.configuration_page.devices_offline",
                      { count: this._offlineDevices }
                    )})`
                  : nothing}
              </small>
            </div>
            <img
              class="logo"
              alt="Zigbee"
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              src=${brandsUrl(
                {
                  domain: "zha",
                  type: "icon",
                  darkOptimized: this.hass.themes?.darkMode,
                },
                this.hass.auth.data.hassUrl
              )}
            />
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderMyNetworkCard(deviceIds: Set<string>, entityCount: number) {
    return html`
      <ha-card class="nav-card">
        <div class="card-header">
          ${this.hass.localize(
            "ui.panel.config.zha.configuration_page.my_network_title"
          )}
          <ha-button appearance="filled" href="/config/zha/visualization">
            <ha-svg-icon slot="start" .path=${mdiVectorPolyline}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.zha.configuration_page.show_map"
            )}
          </ha-button>
        </div>
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item
              type="link"
              href=${`/config/devices/dashboard?historyBack=1&config_entry=${this._configEntry?.entry_id}`}
            >
              <ha-svg-icon slot="start" .path=${mdiDevices}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.device_count",
                  { count: deviceIds.size }
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item
              type="link"
              href=${`/config/entities/dashboard?historyBack=1&config_entry=${this._configEntry?.entry_id}`}
            >
              <ha-svg-icon slot="start" .path=${mdiShape}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.entity_count",
                  { count: entityCount }
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item type="link" href="/config/zha/groups">
              <ha-svg-icon
                slot="start"
                .path=${mdiFolderMultipleOutline}
              ></ha-svg-icon>
              <div
                slot="headline"
                class=${this._asyncDataLoaded && this._totalGroups !== undefined
                  ? "fade-in"
                  : ""}
              >
                ${this._asyncDataLoaded && this._totalGroups !== undefined
                  ? this.hass.localize(
                      "ui.panel.config.zha.configuration_page.group_count",
                      { count: this._totalGroups }
                    )
                  : this.hass.localize(
                      "ui.panel.config.zha.groups.groups.caption"
                    )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  private _renderNavigationCard() {
    const dynamicSections = this._configuration
      ? Object.keys(this._configuration.schemas).filter(
          (section) => section !== "zha_options"
        )
      : [];

    return html`
      <ha-card class="nav-card">
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item type="link" href="/config/zha/options">
              <ha-svg-icon slot="start" .path=${mdiTune}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.options_title"
                )}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.options_description"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item type="link" href="/config/zha/network-info">
              <ha-svg-icon
                slot="start"
                .path=${mdiInformationOutline}
              ></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.network_info_title"
                )}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.network_info_description"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            ${dynamicSections.map(
              (section) => html`
                <ha-md-list-item
                  type="link"
                  href=${`/config/zha/section/${section}`}
                >
                  <ha-svg-icon slot="start" .path=${mdiTune}></ha-svg-icon>
                  <div slot="headline">
                    ${this.hass.localize(
                      `component.zha.config_panel.${section}.title`
                    ) || section}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>
              `
            )}
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  private _renderBackupCard() {
    return html`
      <ha-card class="nav-card">
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.download_backup"
                )}
              </span>
              <span slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.download_backup_description"
                )}
              </span>
              <ha-button
                appearance="plain"
                slot="end"
                size="small"
                @click=${this._createAndDownloadBackup}
              >
                <ha-svg-icon .path=${mdiDownload} slot="start"></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.download_backup_action"
                )}
              </ha-button>
            </ha-md-list-item>
            <ha-md-list-item>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.migrate_radio"
                )}
              </span>
              <span slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.migrate_radio_description"
                )}
              </span>
              <ha-button
                appearance="plain"
                slot="end"
                size="small"
                @click=${this._openOptionFlow}
              >
                ${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.migrate_radio_action"
                )}
              </ha-button>
            </ha-md-list-item>
          </ha-md-list>
        </div>
      </ha-card>
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
  }

  private async _createAndDownloadBackup(): Promise<void> {
    let backup_and_metadata: ZHANetworkBackupAndMetadata;

    try {
      backup_and_metadata = await createZHANetworkBackup(this.hass!);
    } catch (err: any) {
      showAlertDialog(this, {
        title: "Failed to create backup",
        text: err.message,
        warning: true,
      });
      return;
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

  private async _fetchDevicesAndGroups(): Promise<void> {
    const [devicesResult, groupsResult] = await Promise.allSettled([
      fetchDevices(this.hass),
      fetchGroups(this.hass),
    ]);

    if (devicesResult.status === "fulfilled") {
      this._offlineDevices = devicesResult.value.filter(
        (d) => !d.available
      ).length;
    } else {
      this._error = devicesResult.reason?.message || devicesResult.reason;
    }

    if (groupsResult.status === "fulfilled") {
      this._totalGroups = groupsResult.value.length;
    }

    this._asyncDataLoaded = true;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      animationStyles,
      css`
        ha-card {
          margin: auto;
          margin-top: var(--ha-space-4);
          max-width: 600px;
        }

        .nav-card .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: var(--ha-space-2);
        }

        .nav-card {
          overflow: hidden;
        }

        .nav-card .card-content {
          padding: 0;
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

        ha-button[size="small"] ha-svg-icon {
          --mdc-icon-size: 16px;
        }

        .network-status div.heading {
          display: flex;
          align-items: center;
          column-gap: var(--ha-space-4);
        }

        .network-status div.heading .logo {
          height: 40px;
          width: 40px;
          margin-inline-start: auto;
          object-fit: contain;
        }

        .network-status div.heading .icon {
          position: relative;
          border-radius: var(--ha-border-radius-2xl);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          --icon-color: var(--primary-color);
        }

        .network-status div.heading .icon.success {
          --icon-color: var(--success-color);
        }

        .network-status div.heading .icon.error {
          --icon-color: var(--error-color);
        }

        .network-status div.heading .icon::before {
          display: block;
          content: "";
          position: absolute;
          inset: 0;
          background-color: var(--icon-color);
          opacity: 0.2;
        }

        .network-status div.heading .icon ha-svg-icon {
          color: var(--icon-color);
          width: 24px;
          height: 24px;
        }

        .network-status div.heading .details {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          color: var(--primary-text-color);
        }

        .network-status small {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          letter-spacing: 0.25px;
          color: var(--secondary-text-color);
        }

        .network-status small.offline,
        .fade-in {
          animation: fade-in var(--ha-animation-duration-slow) ease-in;
        }

        .container {
          padding: var(--ha-space-2) var(--ha-space-4)
            calc(var(--ha-space-20) + var(--safe-area-inset-bottom, 0px));
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
