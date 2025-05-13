import {
  mdiAlertCircle,
  mdiCheckCircle,
  mdiCircle,
  mdiPlus,
  mdiRefresh,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-list";
import "../../../../../components/ha-list-item";
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
  ZWaveJSControllerStatisticsUpdatedMessage,
  ZWaveJSNetwork,
  ZwaveJSProvisioningEntry,
} from "../../../../../data/zwave_js";
import {
  fetchZwaveDataCollectionStatus,
  fetchZwaveNetworkStatus,
  fetchZwaveProvisioningEntries,
  InclusionState,
  restoreZwaveNVM,
  setZwaveDataCollectionPreference,
  subscribeS2Inclusion,
  subscribeZwaveControllerStatistics,
  subscribeZwaveNVMBackup,
} from "../../../../../data/zwave_js";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { fileDownload } from "../../../../../util/file_download";
import { showZWaveJSAddNodeDialog } from "./add-node/show-dialog-zwave_js-add-node";
import { showZWaveJSRebuildNetworkRoutesDialog } from "./show-dialog-zwave_js-rebuild-network-routes";
import { showZWaveJSRemoveNodeDialog } from "./show-dialog-zwave_js-remove-node";
import { configTabs } from "./zwave_js-config-router";
import { showConfigFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-config-flow";

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

  @state() private _icon = mdiCircle;

  @state() private _dataCollectionOptIn?: boolean;

  @state()
  private _statistics?: ZWaveJSControllerStatisticsUpdatedMessage;

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
    return [
      subscribeZwaveControllerStatistics(
        this.hass,
        this.configEntryId,
        (message) => {
          if (!this.hasUpdated) {
            return;
          }
          this._statistics = message;
        }
      ),
      this._subscribeS2Inclusion(),
    ];
  }

  protected render() {
    if (!this._configEntry) {
      return nothing;
    }

    if (ERROR_STATES.includes(this._configEntry.state)) {
      return this._renderErrorScreen();
    }
    const notReadyDevices =
      this._network?.controller.nodes.filter((node) => !node.ready).length ?? 0;

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configTabs}
      >
        <ha-icon-button
          slot="toolbar-icon"
          @click=${this._fetchData}
          .path=${mdiRefresh}
          .label=${this.hass!.localize("ui.common.refresh")}
        ></ha-icon-button>
        ${this._network
          ? html`
              <ha-card class="content network-status">
                <div class="card-content">
                  <div class="heading">
                    <div class="icon">
                      ${this._status === "disconnected"
                        ? html`<ha-spinner></ha-spinner>`
                        : html`
                            <ha-svg-icon
                              .path=${this._icon}
                              class="network-status-icon ${classMap({
                                [this._status!]: true,
                              })}"
                              slot="item-icon"
                            ></ha-svg-icon>
                          `}
                    </div>
                    ${this._status !== "disconnected"
                      ? html`
                          <div class="details">
                            Z-Wave
                            ${this.hass.localize(
                              "ui.panel.config.zwave_js.common.network"
                            )}
                            ${this.hass.localize(
                              `ui.panel.config.zwave_js.network_status.${this._status}`
                            )}<br />
                            <small>
                              ${this.hass.localize(
                                `ui.panel.config.zwave_js.dashboard.devices`,
                                {
                                  count: this._network.controller.nodes.length,
                                }
                              )}
                              ${notReadyDevices > 0
                                ? html`(${this.hass.localize(
                                    `ui.panel.config.zwave_js.dashboard.not_ready`,
                                    { count: notReadyDevices }
                                  )})`
                                : nothing}
                            </small>
                          </div>
                        `
                      : nothing}
                  </div>
                </div>
                <div class="card-actions">
                  <a
                    href=${`/config/devices/dashboard?historyBack=1&config_entry=${this.configEntryId}`}
                  >
                    <ha-button>
                      ${this.hass.localize("ui.panel.config.devices.caption")}
                    </ha-button>
                  </a>
                  <a
                    href=${`/config/entities/dashboard?historyBack=1&config_entry=${this.configEntryId}`}
                  >
                    <ha-button>
                      ${this.hass.localize("ui.panel.config.entities.caption")}
                    </ha-button>
                  </a>
                  ${this._provisioningEntries?.length
                    ? html`<a
                        href=${`provisioned?config_entry=${this.configEntryId}`}
                        ><ha-button>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.provisioned_devices"
                          )}
                        </ha-button></a
                      >`
                    : nothing}
                </div>
              </ha-card>
              <ha-card header="Diagnostics">
                <div class="card-content">
                  <div class="row">
                    <span>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.driver_version"
                      )}:
                    </span>
                    <span>${this._network.client.driver_version}</span>
                  </div>
                  <div class="row">
                    <span>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.server_version"
                      )}:
                    </span>
                    <span>${this._network.client.server_version}</span>
                  </div>
                  <div class="row">
                    <span>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.home_id"
                      )}:
                    </span>
                    <span>${this._network.controller.home_id}</span>
                  </div>
                  <div class="row">
                    <span>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.server_url"
                      )}:
                    </span>
                    <span>${this._network.client.ws_server_url}</span>
                  </div>
                  <br />
                  <ha-expansion-panel
                    .header=${this.hass.localize(
                      "ui.panel.config.zwave_js.dashboard.statistics.title"
                    )}
                  >
                    <ha-list noninteractive>
                      <ha-list-item twoline hasmeta>
                        <span>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.messages_tx.label"
                          )}
                        </span>
                        <span slot="secondary">
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.messages_tx.tooltip"
                          )}
                        </span>
                        <span slot="meta"
                          >${this._statistics?.messages_tx ?? 0}</span
                        >
                      </ha-list-item>
                      <ha-list-item twoline hasmeta>
                        <span>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.messages_rx.label"
                          )}
                        </span>
                        <span slot="secondary">
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.messages_rx.tooltip"
                          )}
                        </span>
                        <span slot="meta"
                          >${this._statistics?.messages_rx ?? 0}</span
                        >
                      </ha-list-item>
                      <ha-list-item twoline hasmeta>
                        <span>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.messages_dropped_tx.label"
                          )}
                        </span>
                        <span slot="secondary">
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.messages_dropped_tx.tooltip"
                          )}
                        </span>
                        <span slot="meta"
                          >${this._statistics?.messages_dropped_tx ?? 0}</span
                        >
                      </ha-list-item>
                      <ha-list-item twoline hasmeta>
                        <span>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.messages_dropped_rx.label"
                          )}
                        </span>
                        <span slot="secondary">
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.messages_dropped_rx.tooltip"
                          )}
                        </span>
                        <span slot="meta"
                          >${this._statistics?.messages_dropped_rx ?? 0}</span
                        >
                      </ha-list-item>
                      <ha-list-item twoline hasmeta>
                        <span>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.nak.label"
                          )}
                        </span>
                        <span slot="secondary">
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.nak.tooltip"
                          )}
                        </span>
                        <span slot="meta">${this._statistics?.nak ?? 0}</span>
                      </ha-list-item>
                      <ha-list-item twoline hasmeta>
                        <span>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.can.label"
                          )}
                        </span>
                        <span slot="secondary">
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.can.tooltip"
                          )}
                        </span>
                        <span slot="meta">${this._statistics?.can ?? 0}</span>
                      </ha-list-item>
                      <ha-list-item twoline hasmeta>
                        <span>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.timeout_ack.label"
                          )}
                        </span>
                        <span slot="secondary">
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.timeout_ack.tooltip"
                          )}
                        </span>
                        <span slot="meta"
                          >${this._statistics?.timeout_ack ?? 0}</span
                        >
                      </ha-list-item>
                      <ha-list-item twoline hasmeta>
                        <span>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.timeout_response.label"
                          )}
                        </span>
                        <span slot="secondary">
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.timeout_response.tooltip"
                          )}
                        </span>
                        <span slot="meta"
                          >${this._statistics?.timeout_response ?? 0}</span
                        >
                      </ha-list-item>
                      <ha-list-item twoline hasmeta>
                        <span>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.timeout_callback.label"
                          )}
                        </span>
                        <span slot="secondary">
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.dashboard.statistics.timeout_callback.tooltip"
                          )}
                        </span>
                        <span slot="meta"
                          >${this._statistics?.timeout_callback ?? 0}</span
                        >
                      </ha-list-item>
                    </ha-list>
                  </ha-expansion-panel>
                </div>
                <div class="card-actions">
                  <ha-button
                    @click=${this._removeNodeClicked}
                    .disabled=${this._status !== "connected" ||
                    (this._network?.controller.inclusion_state !==
                      InclusionState.Idle &&
                      this._network?.controller.inclusion_state !==
                        InclusionState.SmartStart)}
                  >
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.common.remove_node"
                    )}
                  </ha-button>
                  <ha-button
                    @click=${this._rebuildNetworkRoutesClicked}
                    .disabled=${this._status === "disconnected"}
                  >
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.common.rebuild_network_routes"
                    )}
                  </ha-button>
                </div>
              </ha-card>
              <ha-card>
                <div class="card-header">
                  <h1>Third-Party Data Reporting</h1>
                  ${this._dataCollectionOptIn !== undefined
                    ? html`
                        <ha-switch
                          .checked=${this._dataCollectionOptIn === true}
                          @change=${this._dataCollectionToggled}
                        ></ha-switch>
                      `
                    : html` <ha-spinner size="small"></ha-spinner> `}
                </div>
                <div class="card-content">
                  <p>
                    Enable the reporting of anonymized telemetry and statistics
                    to the <em>Z-Wave JS organization</em>. This data will be
                    used to focus development efforts and improve the user
                    experience. Information about the data that is collected and
                    how it is used, including an example of the data collected,
                    can be found in the
                    <a
                      target="_blank"
                      href="https://zwave-js.github.io/node-zwave-js/#/data-collection/data-collection"
                      >Z-Wave JS data collection documentation</a
                    >.
                  </p>
                </div>
              </ha-card>
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
                <div class="card-actions">
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
                      : html`<ha-button @click=${this._downloadBackup}>
                            ${this.hass.localize(
                              "ui.panel.config.zwave_js.dashboard.nvm_backup.download_backup"
                            )}
                          </ha-button>
                          <div class="upload-button">
                            <ha-button
                              @click=${this._restoreButtonClick}
                              class="warning"
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
                            @click=${this._openConfigFlow}
                            class="warning migrate-button"
                          >
                            ${this.hass.localize(
                              "ui.panel.config.zwave_js.dashboard.nvm_backup.migrate"
                            )}
                          </ha-button>`}
                </div>
              </ha-card>
            `
          : nothing}
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
            <ha-svg-icon .path=${mdiAlertCircle}></ha-svg-icon>
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
    history.back();
  }

  private async _fetchData() {
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
    if (this._status === "connected") {
      this._icon = mdiCheckCircle;
    }

    this._dataCollectionOptIn =
      dataCollectionStatus.opted_in === true ||
      dataCollectionStatus.enabled === true;
  }

  private async _addNodeClicked() {
    this._openInclusionDialog();
  }

  private async _removeNodeClicked() {
    showZWaveJSRemoveNodeDialog(this, {
      entry_id: this.configEntryId!,
      skipConfirmation:
        this._network?.controller.inclusion_state === InclusionState.Excluding,
      removedCallback: () => this._fetchData(),
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
        .secondary {
          color: var(--secondary-text-color);
        }
        .connected {
          color: green;
        }
        .starting {
          color: orange;
        }
        .offline {
          color: red;
        }

        .error-message {
          display: flex;
          color: var(--primary-text-color);
          height: calc(100% - var(--header-height));
          padding: 16px;
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
          margin-top: 24px;
        }

        .sectionHeader {
          position: relative;
          padding-right: 40px;
          padding-inline-end: 40px;
          padding-inline-start: initial;
        }

        .row {
          display: flex;
          justify-content: space-between;
        }

        span[slot="meta"] {
          font-size: 0.95em;
          color: var(--primary-text-color);
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
          font-size: 1.5rem;
        }

        .network-status small {
          font-size: 1rem;
        }

        ha-list-item {
          height: 60px;
        }

        .card-header {
          display: flex;
        }
        .card-header h1 {
          flex: 1;
        }
        .card-header ha-switch {
          width: 48px;
          margin-top: 16px;
        }

        ha-card {
          margin: 0px auto 24px;
          max-width: 600px;
        }

        .card-actions {
          display: flex;
          align-items: center;
        }

        .card-actions ha-progress-ring {
          margin-right: 16px;
        }

        [hidden] {
          display: none;
        }

        .upload-button {
          display: inline-block;
          position: relative;
        }

        .upload-button ha-button {
          position: relative;
          overflow: hidden;
        }

        .button-content {
          pointer-events: none;
        }

        .migrate-button {
          margin-left: auto;
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
