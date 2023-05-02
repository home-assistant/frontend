import "@material/mwc-button/mwc-button";
import {
  mdiFolderMultipleOutline,
  mdiLan,
  mdiNetwork,
  mdiPlus,
  mdiPencil,
} from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  ConfigEntry,
  getConfigEntries,
} from "../../../../../data/config_entries";
import { computeRTL } from "../../../../../common/util/compute_rtl";
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
import { showZHAMigrateChannelDialog } from "./show-dialog-zha-migrate-channel";
import {
  fetchZHAConfiguration,
  updateZHAConfiguration,
  ZHAConfiguration,
  fetchZHANetworkSettings,
  createZHANetworkBackup,
  ZHANetworkSettings,
  ZHANetworkBackupAndMetadata,
} from "../../../../../data/zha";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";

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
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() private _configuration?: ZHAConfiguration;

  @property() private _networkSettings?: ZHANetworkSettings;

  @state() private _generatingBackup = false;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this.hass.loadBackendTranslation("config_panel", "zha", false);
      this._fetchConfiguration();
      this._fetchSettings();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${zhaTabs}
        back-path="/config/integrations"
      >
        <ha-card
          header=${this.hass.localize(
            "ui.panel.config.zha.configuration_page.shortcuts_title"
          )}
        >
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
                <div class="item">
                  <div>
                    <div class="value">
                      ${this._networkSettings.settings.network_info.pan_id}
                    </div>
                    <div class="label">PAN ID</div>
                  </div>
                </div>
                <div class="item">
                  <div>
                    <div class="value">
                      ${this._networkSettings.settings.network_info
                        .extended_pan_id}
                    </div>
                    <div class="label">Extended PAN ID</div>
                  </div>
                </div>
                <div class="item">
                  <div>
                    <div class="value">
                      ${this._networkSettings.settings.network_info.channel}
                    </div>
                    <div class="label">Channel</div>
                  </div>

                  <ha-icon-button
                    .label=${this.hass.localize(
                      "ui.panel.config.zha.configuration_page.change_channel"
                    )}
                    .path=${mdiPencil}
                    @click=${this._showChannelMigrationDialog}
                  >
                  </ha-icon-button>
                </div>
                <div class="item">
                  <div>
                    <div class="value">
                      ${this._networkSettings.settings.node_info.ieee}
                    </div>
                    <div class="label">Coordinator IEEE</div>
                  </div>
                </div>
                <div class="item">
                  <div>
                    <div class="value">
                      ${this._networkSettings.settings.network_info.network_key
                        .key}
                    </div>
                    <div class="label">Network key</div>
                  </div>
                </div>
                <div class="item">
                  <div>
                    <div class="value">${this._networkSettings.radio_type}</div>
                    <div class="label">Radio type</div>
                  </div>
                </div>
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
        ${this._networkSettings
          ? html`
              <ha-card
                header=${this.hass.localize(
                  "ui.panel.config.zha.configuration_page.network_management_title"
                )}
              >
                <div class="card-content">
                  <p>
                    <mwc-button @click=${this._updateConfiguration}>
                      ${this.hass.localize(
                        "ui.panel.config.zha.configuration_page.change_channel"
                      )}
                    </mwc-button>
                  </p>
                </div>
              </ha-card>
            `
          : ""}
        ${this._configuration
          ? Object.entries(this._configuration.schemas).map(
              ([section, schema]) => html`<ha-card
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
            ?rtl=${computeRTL(this.hass)}
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

  private async _showChannelMigrationDialog(): Promise<void> {
    showZHAMigrateChannelDialog(this, {
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

        .network-settings > div {
          word-break: break-all;
          margin-top: 2px;
        }

        .network-settings > .card-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .network-settings .item .label {
          font-size: 0.85em;
          color: var(--mdc-text-field-label-ink-color);
        }

        .network-settings .item {
          display: flex;
          justify-content: space-between;
        }

        .network-settings .item:not(:last-of-type) {
          margin-bottom: 0.9em;
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
