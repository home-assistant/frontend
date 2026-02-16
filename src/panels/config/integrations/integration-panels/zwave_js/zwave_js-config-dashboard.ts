import {
  mdiAlertCircleOutline,
  mdiCheck,
  mdiDevices,
  mdiPlus,
  mdiQrcode,
  mdiRefresh,
  mdiShapeOutline,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
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
import "../../../../../components/ha-switch";
import { goBack } from "../../../../../common/navigate";
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
  setZwaveDataCollectionPreference,
  subscribeS2Inclusion,
  subscribeZwaveNVMBackup,
} from "../../../../../data/zwave_js";
import { showConfigFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-config-flow";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { fileDownload } from "../../../../../util/file_download";
import { showZWaveJSAddNodeDialog } from "./add-node/show-dialog-zwave_js-add-node";
import { formatHomeIdAsHex } from "./functions";
import { showZWaveJSRebuildNetworkRoutesDialog } from "./show-dialog-zwave_js-rebuild-network-routes";
import { showZWaveJSRemoveNodeDialog } from "./show-dialog-zwave_js-remove-node";
import { configTabs } from "./zwave_js-config-router";

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
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configTabs}
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
                ${this._renderNetworkCard()} ${this._renderBackupCard()}
                ${this._renderNetworkInfoCard()}
                ${this._renderDataCollectionCard()}
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
      </hass-tabs-subpage>
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
        this.hass.localize("ui.panel.config.zwave_js.dashboard.not_ready", {
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
              Z-Wave
              ${this.hass.localize(
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
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderNetworkCard() {
    return html`
      <ha-card>
        <div class="card-header">
          ${this.hass.localize(
            "ui.panel.config.zwave_js.dashboard.network_card_title"
          )}
        </div>
        <div class="card-content network-card-content">
          <ha-md-list>
            <ha-md-list-item
              type="link"
              href=${`/config/devices/dashboard?historyBack=1&config_entry=${this.configEntryId}`}
            >
              <ha-svg-icon slot="start" .path=${mdiDevices}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize("ui.panel.config.devices.caption")}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item
              type="link"
              href=${`/config/entities/dashboard?historyBack=1&config_entry=${this.configEntryId}`}
            >
              <ha-svg-icon slot="start" .path=${mdiShapeOutline}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize("ui.panel.config.entities.caption")}
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
                      "ui.panel.config.zwave_js.dashboard.provisioned_devices"
                    )}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>`
              : nothing}
          </ha-md-list>
        </div>
        <div class="card-actions">
          <ha-button
            appearance="plain"
            @click=${this._rebuildNetworkRoutesClicked}
            .disabled=${this._status === "disconnected"}
          >
            ${this.hass.localize(
              "ui.panel.config.zwave_js.common.rebuild_network_routes"
            )}
          </ha-button>
          <ha-button
            class="remove-node-button"
            appearance="plain"
            @click=${this._removeNodeClicked}
            .disabled=${this._status !== "connected" ||
            (this._network?.controller.inclusion_state !==
              InclusionState.Idle &&
              this._network?.controller.inclusion_state !==
                InclusionState.SmartStart)}
          >
            ${this.hass.localize("ui.panel.config.zwave_js.common.remove_node")}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _renderNetworkInfoCard() {
    return html`
      <ha-card
        .header=${this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.network_info_title"
        )}
      >
        <ha-md-list class="network-info">
          <ha-md-list-item>
            <span slot="headline">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.dashboard.home_id"
              )}
            </span>
            <span slot="supporting-text">
              ${formatHomeIdAsHex(this._network!.controller.home_id)}
            </span>
          </ha-md-list-item>
          <ha-md-list-item>
            <span slot="headline">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.dashboard.driver_version"
              )}
            </span>
            <span slot="supporting-text">
              ${this._network!.client.driver_version}
            </span>
          </ha-md-list-item>
          <ha-md-list-item>
            <span slot="headline">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.dashboard.server_version"
              )}
            </span>
            <span slot="supporting-text">
              ${this._network!.client.server_version}
            </span>
          </ha-md-list-item>
          <ha-md-list-item>
            <span slot="headline">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.dashboard.server_url"
              )}
            </span>
            <span slot="supporting-text">
              ${this._network!.client.ws_server_url}
            </span>
          </ha-md-list-item>
        </ha-md-list>
      </ha-card>
    `;
  }

  private _renderDataCollectionCard() {
    return html`
      <ha-card
        .header=${this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.data_collection.title"
        )}
      >
        <ha-md-list>
          <ha-md-list-item>
            <span slot="supporting-text">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.dashboard.data_collection.description",
                {
                  documentation_link: html`<a
                    target="_blank"
                    href="https://zwave-js.github.io/node-zwave-js/#/data-collection/data-collection"
                    >${this.hass.localize(
                      "ui.panel.config.zwave_js.dashboard.data_collection.documentation_link"
                    )}</a
                  >`,
                }
              )}
            </span>
            ${this._dataCollectionOptIn !== undefined
              ? html`
                  <ha-switch
                    slot="end"
                    .checked=${this._dataCollectionOptIn === true}
                    @change=${this._dataCollectionToggled}
                  ></ha-switch>
                `
              : html`<ha-spinner slot="end" size="small"></ha-spinner>`}
          </ha-md-list-item>
        </ha-md-list>
      </ha-card>
    `;
  }

  private _renderBackupCard() {
    return html`
      <ha-card
        .header=${this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.nvm_backup.title"
        )}
      >
        <div class="card-content">
          <p>
            ${this.hass.localize(
              "ui.panel.config.zwave_js.dashboard.nvm_backup.description"
            )}
          </p>
        </div>
        <div class="card-actions backup-actions">
          ${this._backupProgress !== undefined
            ? html`<ha-progress-ring
                  size="small"
                  .value=${this._backupProgress}
                ></ha-progress-ring>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.nvm_backup.creating"
                )}
                ${this._backupProgress}%`
            : this._restoreProgress !== undefined
              ? html`<ha-progress-ring
                    size="small"
                    .value=${this._restoreProgress}
                  ></ha-progress-ring>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.dashboard.nvm_backup.restoring"
                  )}
                  ${this._restoreProgress}%`
              : html`<ha-button
                    appearance="plain"
                    @click=${this._downloadBackup}
                  >
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.dashboard.nvm_backup.download_backup"
                    )}
                  </ha-button>
                  <div class="right-buttons">
                    <div class="upload-button">
                      <ha-button
                        appearance="plain"
                        @click=${this._restoreButtonClick}
                      >
                        <span class="button-content">
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.nvm_backup.restore_backup"
                          )}
                        </span>
                      </ha-button>
                      <input
                        type="file"
                        id="nvm-restore-file"
                        accept=".bin"
                        @change=${this._handleRestoreFileSelected}
                        style="display: none"
                      />
                    </div>
                    <ha-button
                      appearance="filled"
                      @click=${this._openConfigFlow}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.nvm_backup.migrate"
                      )}
                    </ha-button>
                  </div>`}
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
    this._configEntry = configEntries.find(
      (entry) => entry.entry_id === this.configEntryId
    );

    if (ERROR_STATES.includes(this._configEntry!.state)) {
      return;
    }

    const [network, dataCollectionStatus, provisioningEntries] =
      await Promise.all([
        fetchZwaveNetworkStatus(this.hass!, { entry_id: this.configEntryId }),
        fetchZwaveDataCollectionStatus(this.hass!, this.configEntryId),
        fetchZwaveProvisioningEntries(this.hass!, this.configEntryId),
      ]);

    this._provisioningEntries = provisioningEntries;

    this._network = network;

    this._status = this._network.client.state;

    this._dataCollectionOptIn =
      dataCollectionStatus.opted_in === true ||
      dataCollectionStatus.enabled === true;
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

  private async _rebuildNetworkRoutesClicked() {
    showZWaveJSRebuildNetworkRoutesDialog(this, {
      entry_id: this.configEntryId!,
    });
  }

  private _dataCollectionToggled(ev) {
    setZwaveDataCollectionPreference(
      this.hass!,
      this.configEntryId!,
      ev.target.checked
    );
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
        .network-status small.offline {
          color: var(--secondary-text-color);
        }

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

        .network-card-content {
          padding-left: 0;
          padding-right: 0;
          padding-bottom: 0;
        }

        .network-info ha-md-list-item {
          --md-list-item-supporting-text-size: var(
            --md-list-item-label-text-size,
            var(--md-sys-typescale-body-large-size, 1rem)
          );
        }

        .network-status div.heading {
          display: flex;
          align-items: center;
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
          margin-inline-end: var(--ha-space-4);
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
          flex: 1;
          font-size: var(--ha-font-size-xl);
        }

        .network-status small {
          font-size: var(--ha-font-size-m);
        }

        .card-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }

        .card-actions ha-progress-ring {
          margin-inline-end: var(--ha-space-4);
        }

        .backup-actions {
          justify-content: space-between;
        }

        .upload-button {
          position: relative;
          display: flex;
        }

        .upload-button ha-button {
          position: relative;
          overflow: hidden;
        }

        .button-content {
          pointer-events: none;
        }

        .remove-node-button {
          margin-inline-start: auto;
        }

        .right-buttons {
          display: flex;
          gap: var(--ha-space-2);
          margin-inline-start: auto;
          flex-wrap: wrap;
        }

        [hidden] {
          display: none;
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
    "zwave_js-config-dashboard": ZWaveJSConfigDashboard;
  }
}
