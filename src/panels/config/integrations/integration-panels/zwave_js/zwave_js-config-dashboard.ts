import {
  mdiAlertCircleOutline,
  mdiChartBox,
  mdiCheck,
  mdiDevices,
  mdiDownload,
  mdiInformationOutline,
  mdiPlus,
  mdiPoll,
  mdiQrcode,
  mdiRefresh,
  mdiShape,
  mdiTextBoxOutline,
  mdiTune,
  mdiVectorPolyline,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { goBack } from "../../../../../common/navigate";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-progress-ring";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import type { ConfigEntry } from "../../../../../data/config_entries";
import {
  ERROR_STATES,
  getConfigEntries,
} from "../../../../../data/config_entries";
import type {
  ZWaveJSClient,
  ZWaveJSNetwork,
  ZwaveJSProvisioningEntry,
} from "../../../../../data/zwave_js";
import {
  fetchZwaveDataCollectionStatus,
  fetchZwaveNetworkStatus,
  fetchZwaveProvisioningEntries,
  InclusionState,
  NodeStatus,
  ProvisioningEntryStatus,
  restoreZwaveNVM,
  subscribeS2Inclusion,
  subscribeZwaveNVMBackup,
} from "../../../../../data/zwave_js";
import { showConfigFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-config-flow";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { brandsUrl } from "../../../../../util/brands-url";
import { fileDownload } from "../../../../../util/file_download";
import { showZWaveJSAddNodeDialog } from "./add-node/show-dialog-zwave_js-add-node";
import { showZWaveJSRemoveNodeDialog } from "./show-dialog-zwave_js-remove-node";

@customElement("zwave_js-config-dashboard")
class ZWaveJSConfigDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public configEntryId!: string;

  @state() private _configEntry?: ConfigEntry;

  @state() private _network?: ZWaveJSNetwork;

  @state() private _provisioningEntries?: ZwaveJSProvisioningEntry[];

  @state() private _status?: ZWaveJSClient["state"];

  @state() private _dataCollectionOptIn?: boolean;

  @state() private _multipleNetworks = false;

  private _dialogOpen = false;

  private _s2InclusionUnsubscribe?: Promise<UnsubscribeFunc>;

  private _unsubscribeBackup?: UnsubscribeFunc;

  private _unsubscribeRestore?: UnsubscribeFunc;

  private _backupProgress?: number;

  private _restoreProgress?: number;

  protected async firstUpdated() {
    if (this.hass) {
      await this._fetchData();
      if (this._status === "connected") {
        const inclusion_state = this._network?.controller.inclusion_state;
        // show dialog if inclusion/exclusion is already in progress
        if (inclusion_state === InclusionState.Including) {
          this._openInclusionDialog(undefined, true);
        } else if (inclusion_state === InclusionState.Excluding) {
          this._removeNodeClicked();
        }
      }
    }
  }

  public hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [this._subscribeS2Inclusion()];
  }

  protected render() {
    if (!this._configEntry) {
      return nothing;
    }

    if (ERROR_STATES.includes(this._configEntry.state)) {
      return this._renderErrorScreen();
    }

    const provisioningDevices =
      this._provisioningEntries?.filter(
        (entry) =>
          !entry.nodeId && entry.status === ProvisioningEntryStatus.Active
      ).length ?? 0;
    const nodes = this._network?.controller.nodes ?? [];
    const offlineDevices = nodes.filter(
      (node) => node.status === NodeStatus.Dead
    ).length;
    const notReadyDevices =
      nodes.filter((node) => !node.ready && node.status !== NodeStatus.Dead)
        .length + provisioningDevices;

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.zwave_js.navigation.general"
        )}
        back-path="/config"
        has-fab
      >
        <ha-icon-button
          slot="toolbar-icon"
          @click=${this._fetchData}
          .path=${mdiRefresh}
          .label=${this.hass!.localize("ui.common.refresh")}
        ></ha-icon-button>
        <div class="container">
          ${this._network
            ? html`
                ${this._renderNetworkStatus(
                  provisioningDevices,
                  offlineDevices,
                  notReadyDevices
                )}
                ${this._renderNetworkCard()} ${this._renderNavigationCard()}
                ${this._renderBackupCard()}
              `
            : nothing}
        </div>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.zwave_js.common.add_node"
          )}
          extended
          @click=${this._addNodeClicked}
          .disabled=${this._status !== "connected" ||
          (this._network?.controller.inclusion_state !== InclusionState.Idle &&
            this._network?.controller.inclusion_state !==
              InclusionState.SmartStart)}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-subpage>
    `;
  }

  private _renderNetworkStatus(
    provisioningDevices: number,
    offlineDevices: number,
    notReadyDevices: number
  ) {
    const deviceOnline = this._status === "connected";
    const statusParts: string[] = [];
    if (offlineDevices > 0) {
      statusParts.push(
        this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.devices_offline",
          { count: offlineDevices }
        )
      );
    }
    if (notReadyDevices > 0) {
      statusParts.push(
        this.hass.localize("ui.panel.config.zwave_js.dashboard.not_included", {
          count: notReadyDevices,
        })
      );
    }
    return html`
      <ha-card class="content network-status">
        <div class="card-content">
          <div class="heading">
            <div class="icon ${deviceOnline ? "online" : "offline"}">
              <ha-svg-icon
                .path=${deviceOnline ? mdiCheck : mdiAlertCircleOutline}
              ></ha-svg-icon>
            </div>
            <div class="details">
              ${this._multipleNetworks && this._configEntry
                ? this.hass.localize(
                    `ui.panel.config.zwave_js.network_status.${deviceOnline ? "online" : "offline"}_named`,
                    { name: this._configEntry.title }
                  )
                : this.hass.localize(
                    `ui.panel.config.zwave_js.network_status.${deviceOnline ? "online" : "offline"}`
                  )}<br />
              <small>
                ${this.hass.localize(
                  `ui.panel.config.zwave_js.dashboard.devices`,
                  {
                    count:
                      this._network!.controller.nodes.length +
                      provisioningDevices,
                  }
                )}
              </small>
              <small class="offline">
                ${statusParts.length > 0
                  ? html`(${statusParts.join(
                      ` ${this.hass.localize("ui.common.and")} `
                    )})`
                  : nothing}
              </small>
            </div>
            <img
              class="logo"
              alt="Z-Wave"
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              src=${brandsUrl(
                {
                  domain: "zwave_js",
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

  private _renderNetworkCard() {
    const deviceIds = new Set(
      Object.values(this.hass.devices)
        .filter((device) => device.config_entries.includes(this.configEntryId))
        .map((device) => device.id)
    );
    const entityCount = Object.values(this.hass.entities).filter(
      (entity) => entity.device_id && deviceIds.has(entity.device_id)
    ).length;

    return html`
      <ha-card class="network-card">
        <div class="card-header">
          ${this.hass.localize(
            "ui.panel.config.zwave_js.dashboard.network_card_title"
          )}
          <ha-button
            appearance="filled"
            href=${`visualization?config_entry=${this.configEntryId}`}
          >
            <ha-svg-icon slot="start" .path=${mdiVectorPolyline}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.zwave_js.dashboard.show_map")}
          </ha-button>
        </div>
        <div class="card-content network-card-content">
          <ha-md-list>
            <ha-md-list-item
              type="link"
              href=${`/config/devices/dashboard?historyBack=1&config_entry=${this.configEntryId}`}
            >
              <ha-svg-icon slot="start" .path=${mdiDevices}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.device_count",
                  { count: deviceIds.size }
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item
              type="link"
              href=${`/config/entities/dashboard?historyBack=1&config_entry=${this.configEntryId}`}
            >
              <ha-svg-icon slot="start" .path=${mdiShape}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.entity_count",
                  { count: entityCount }
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            ${this._provisioningEntries?.length
              ? html`<ha-md-list-item
                  type="link"
                  href=${`provisioned?config_entry=${this.configEntryId}`}
                >
                  <ha-svg-icon slot="start" .path=${mdiQrcode}></ha-svg-icon>
                  <div slot="headline">
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.dashboard.provisioned_count",
                      { count: this._provisioningEntries.length }
                    )}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>`
              : nothing}
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  private _renderNavigationCard() {
    return html`
      <ha-card class="nav-card">
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item
              type="link"
              href=${`options?config_entry=${this.configEntryId}`}
            >
              <ha-svg-icon slot="start" .path=${mdiTune}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.options_title"
                )}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.options_description"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item
              type="link"
              href=${`statistics?config_entry=${this.configEntryId}`}
            >
              <ha-svg-icon slot="start" .path=${mdiPoll}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.navigation.statistics"
                )}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.statistics_description"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item
              type="link"
              href=${`logs?config_entry=${this.configEntryId}`}
            >
              <ha-svg-icon
                slot="start"
                .path=${mdiTextBoxOutline}
              ></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.navigation.logs"
                )}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.logs_description"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item type="link" href="/config/analytics?section=zwave">
              <ha-svg-icon slot="start" .path=${mdiChartBox}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.analytics_title"
                )}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.analytics_description"
                )}
              </div>
              <span slot="end">
                ${this._dataCollectionOptIn !== undefined
                  ? this.hass.localize(
                      `ui.panel.config.zwave_js.dashboard.analytics_${this._dataCollectionOptIn ? "on" : "off"}`
                    )
                  : nothing}
              </span>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item
              type="link"
              href=${`network-info?config_entry=${this.configEntryId}`}
            >
              <ha-svg-icon
                slot="start"
                .path=${mdiInformationOutline}
              ></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.network_info_title"
                )}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.network_info_description"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  private _renderBackupCard() {
    return html`
      <ha-card class="nav-card">
        <div class="card-content">
          ${this._backupProgress !== undefined
            ? html`<div class="backup-progress">
                <ha-progress-ring
                  size="small"
                  .value=${this._backupProgress}
                ></ha-progress-ring>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.nvm_backup.creating"
                )}
                ${this._backupProgress}%
              </div>`
            : this._restoreProgress !== undefined
              ? html`<div class="backup-progress">
                  <ha-progress-ring
                    size="small"
                    .value=${this._restoreProgress}
                  ></ha-progress-ring>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.dashboard.nvm_backup.restoring"
                  )}
                  ${this._restoreProgress}%
                </div>`
              : html`<ha-md-list>
                  <ha-md-list-item>
                    <span slot="headline">
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.nvm_backup.download_backup"
                      )}
                    </span>
                    <span slot="supporting-text">
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.nvm_backup.download_backup_description"
                      )}
                    </span>
                    <ha-button
                      appearance="plain"
                      slot="end"
                      size="small"
                      @click=${this._downloadBackup}
                    >
                      <ha-svg-icon
                        .path=${mdiDownload}
                        slot="start"
                      ></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.nvm_backup.download_action"
                      )}
                    </ha-button>
                  </ha-md-list-item>
                  <ha-md-list-item>
                    <span slot="headline">
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.nvm_backup.restore_backup"
                      )}
                    </span>
                    <span slot="supporting-text">
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.nvm_backup.restore_backup_description"
                      )}
                    </span>
                    <ha-button
                      appearance="plain"
                      slot="end"
                      size="small"
                      @click=${this._restoreButtonClick}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.nvm_backup.restore_action"
                      )}
                    </ha-button>
                    <input
                      type="file"
                      id="nvm-restore-file"
                      accept=".bin"
                      @change=${this._handleRestoreFileSelected}
                      style="display: none"
                    />
                  </ha-md-list-item>
                  <ha-md-list-item>
                    <span slot="headline">
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.nvm_backup.migrate"
                      )}
                    </span>
                    <span slot="supporting-text">
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.nvm_backup.migrate_description"
                      )}
                    </span>
                    <ha-button
                      appearance="plain"
                      slot="end"
                      size="small"
                      @click=${this._openConfigFlow}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.nvm_backup.migrate_action"
                      )}
                    </ha-button>
                  </ha-md-list-item>
                </ha-md-list>`}
        </div>
      </ha-card>
    `;
  }

  private _renderErrorScreen() {
    const item = this._configEntry!;
    let stateText: Parameters<typeof this.hass.localize> | undefined;
    let stateTextExtra: TemplateResult | string | undefined;

    if (item.disabled_by) {
      stateText = [
        "ui.panel.config.integrations.config_entry.disable.disabled_cause",
        {
          cause:
            this.hass.localize(
              `ui.panel.config.integrations.config_entry.disable.disabled_by.${item.disabled_by}`
            ) || item.disabled_by,
        },
      ];
      if (item.state === "failed_unload") {
        stateTextExtra = html`.
        ${this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_restart_confirm"
        )}.`;
      }
    } else if (item.state === "not_loaded") {
      stateText = ["ui.panel.config.integrations.config_entry.not_loaded"];
    } else if (ERROR_STATES.includes(item.state)) {
      stateText = [
        `ui.panel.config.integrations.config_entry.state.${item.state}`,
      ];
      if (item.reason) {
        this.hass.loadBackendTranslation("config", item.domain);
        stateTextExtra = html` ${this.hass.localize(
          `component.${item.domain}.config.error.${item.reason}`
        ) || item.reason}`;
      } else {
        stateTextExtra = html`
          <br />
          <a href="/config/logs?filter=zwave_js"
            >${this.hass.localize(
              "ui.panel.config.integrations.config_entry.check_the_logs"
            )}</a
          >
        `;
      }
    }

    return html` ${stateText
      ? html`
          <div class="error-message">
            <ha-svg-icon .path=${mdiAlertCircleOutline}></ha-svg-icon>
            <h3>
              ${this._configEntry!.title}: ${this.hass.localize(...stateText)}
            </h3>
            <p>${stateTextExtra}</p>
            <ha-button @click=${this._handleBack}>
              ${this.hass?.localize("ui.common.back")}
            </ha-button>
          </div>
        `
      : nothing}`;
  }

  private _handleBack(): void {
    goBack("/config");
  }

  private _fetchData = async () => {
    if (!this.configEntryId) {
      return;
    }
    const configEntries = await getConfigEntries(this.hass, {
      domain: "zwave_js",
    });
    this._multipleNetworks =
      configEntries.filter(
        (entry) => entry.disabled_by === null && entry.source !== "ignore"
      ).length > 1;
    this._configEntry = configEntries.find(
      (entry) => entry.entry_id === this.configEntryId
    );

    if (ERROR_STATES.includes(this._configEntry!.state)) {
      return;
    }

    const [network, provisioningEntries] = await Promise.all([
      fetchZwaveNetworkStatus(this.hass!, { entry_id: this.configEntryId }),
      fetchZwaveProvisioningEntries(this.hass!, this.configEntryId),
    ]);

    this._provisioningEntries = provisioningEntries;

    this._network = network;

    this._status = this._network.client.state;

    try {
      const status = await fetchZwaveDataCollectionStatus(
        this.hass,
        this.configEntryId
      );
      this._dataCollectionOptIn =
        status.opted_in === true || status.enabled === true;
    } catch {
      // Data collection status is optional
    }
  };

  private async _addNodeClicked() {
    this._openInclusionDialog();
  }

  private async _removeNodeClicked() {
    showZWaveJSRemoveNodeDialog(this, {
      entryId: this.configEntryId!,
      skipConfirmation:
        this._network?.controller.inclusion_state === InclusionState.Excluding,
      onClose: this._fetchData,
    });
  }

  private async _openConfigFlow() {
    if (!this.configEntryId) {
      return;
    }
    showConfigFlowDialog(this, {
      startFlowHandler: "zwave_js",
      domain: "zwave_js",
      entryId: this.configEntryId,
    });
  }

  private async _downloadBackup() {
    try {
      this._backupProgress = 0;
      this._unsubscribeBackup = await subscribeZwaveNVMBackup(
        this.hass!,
        this.configEntryId!,
        this._handleBackupMessage
      );
    } catch (err: any) {
      this._backupProgress = undefined;
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.nvm_backup.backup_failed"
        ),
        text: err.message,
        warning: true,
      });
    }
  }

  private _restoreButtonClick() {
    const fileInput = this.shadowRoot?.querySelector(
      "#nvm-restore-file"
    ) as HTMLInputElement;
    fileInput?.click();
  }

  private async _handleRestoreFileSelected(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const input = ev.target as HTMLInputElement;

    try {
      this._restoreProgress = 0;
      // Read the file as base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as ArrayBuffer;
          const base64 = btoa(
            new Uint8Array(result).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          resolve(base64);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsArrayBuffer(file);
      });

      this._unsubscribeRestore = await restoreZwaveNVM(
        this.hass!,
        this.configEntryId!,
        base64Data,
        this._handleRestoreMessage
      );
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.nvm_backup.restore_failed"
        ),
        text: err.message,
        warning: true,
      });
      this._restoreProgress = undefined;
    }

    // Reset the file input so the same file can be selected again
    input.value = "";
  }

  private _openInclusionDialog(dsk?: string, inclusionOngoing = false) {
    if (!this._dialogOpen) {
      // Unsubscribe from S2 inclusion before opening dialog
      if (this._s2InclusionUnsubscribe) {
        this._s2InclusionUnsubscribe.then((unsubscribe) => unsubscribe());
        this._s2InclusionUnsubscribe = undefined;
      }

      showZWaveJSAddNodeDialog(this, {
        entry_id: this.configEntryId!,
        dsk,
        onStop: this._handleInclusionDialogClosed,
        longRangeSupported: !!this._network?.controller?.supports_long_range,
        inclusionOngoing,
      });
      this._dialogOpen = true;
    }
  }

  private _handleInclusionDialogClosed = () => {
    // refresh the data after the dialog is closed. add a small delay for the inclusion state to update
    setTimeout(() => this._fetchData(), 100);
    this._dialogOpen = false;
    this._subscribeS2Inclusion();
  };

  private _subscribeS2Inclusion() {
    this._s2InclusionUnsubscribe = subscribeS2Inclusion(
      this.hass,
      this.configEntryId,
      (message) => {
        this._openInclusionDialog(message.dsk);
      }
    );
    return this._s2InclusionUnsubscribe;
  }

  private _handleBackupMessage = (message: any) => {
    if (message.event === "finished") {
      this._backupProgress = undefined;
      this._unsubscribeBackup?.();
      this._unsubscribeBackup = undefined;
      try {
        const blob = new Blob(
          [Uint8Array.from(atob(message.data), (c) => c.charCodeAt(0))],
          { type: "application/octet-stream" }
        );
        const url = URL.createObjectURL(blob);
        fileDownload(
          url,
          `zwave_js_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.bin`
        );
        URL.revokeObjectURL(url);
      } catch (err: any) {
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.zwave_js.dashboard.nvm_backup.backup_failed"
          ),
          text: err.message,
          warning: true,
        });
      }
    } else if (message.event === "nvm backup progress") {
      this._backupProgress = Math.round(
        (message.bytesRead / message.total) * 100
      );
    }
  };

  private _handleRestoreMessage = (message: any) => {
    if (message.event === "finished") {
      this._restoreProgress = undefined;
      this._unsubscribeRestore?.();
      this._unsubscribeRestore = undefined;

      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.nvm_backup.restore_complete"
        ),
      });
      this._fetchData();
    } else if (message.event === "nvm convert progress") {
      // assume convert takes half the time of restore
      this._restoreProgress = Math.round(
        (message.bytesRead / message.total) * 50
      );
    } else if (message.event === "nvm restore progress") {
      this._restoreProgress =
        Math.round((message.bytesWritten / message.total) * 50) + 50;
    }
  };

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .error-message {
          display: flex;
          color: var(--primary-text-color);
          height: calc(100% - var(--header-height));
          padding: var(--ha-space-4);
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        .error-message h3 {
          text-align: center;
          font-weight: var(--ha-font-weight-bold);
        }

        .error-message ha-svg-icon {
          color: var(--error-color);
          width: 64px;
          height: 64px;
        }

        .content {
          margin-top: var(--ha-space-6);
        }

        ha-card {
          margin: 0px auto var(--ha-space-4);
          max-width: 600px;
        }

        ha-md-list {
          background: none;
          padding: 0;
        }

        ha-md-list-item {
          --md-item-overflow: visible;
        }

        .network-card .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: var(--ha-space-2);
        }

        .network-card-content {
          padding-left: 0;
          padding-right: 0;
          padding-bottom: 0;
        }

        .nav-card {
          overflow: hidden;
        }

        .nav-card .card-content {
          padding: 0;
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

        .network-status div.heading .icon.online {
          --icon-color: var(--success-color);
        }

        .network-status div.heading .icon.offline {
          --icon-color: var(--error-color);
        }

        .network-status div.heading .icon::before {
          display: block;
          content: "";
          position: absolute;
          inset: 0;
          background-color: var(--icon-color, var(--primary-color));
          opacity: 0.2;
        }

        .network-status div.heading .icon ha-svg-icon {
          color: var(--icon-color, var(--primary-color));
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

        .backup-progress {
          display: flex;
          align-items: center;
          padding: var(--ha-space-4);
          gap: var(--ha-space-4);
        }

        ha-button[size="small"] ha-svg-icon {
          --mdc-icon-size: 16px;
        }

        [hidden] {
          display: none;
        }

        .container {
          padding: var(--ha-space-2) var(--ha-space-4)
            calc(var(--ha-space-16) + var(--safe-area-inset-bottom, 0px));
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-config-dashboard": ZWaveJSConfigDashboard;
  }
}
