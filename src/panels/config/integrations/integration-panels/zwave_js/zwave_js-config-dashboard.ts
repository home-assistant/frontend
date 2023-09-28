import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import {
  mdiAlertCircle,
  mdiCheckCircle,
  mdiCircle,
  mdiPlus,
  mdiRefresh,
} from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { computeRTL } from "../../../../../common/util/compute_rtl";
import "../../../../../components/ha-card";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-fab";
import "../../../../../components/ha-help-tooltip";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-svg-icon";
import {
  ConfigEntry,
  ERROR_STATES,
  getConfigEntries,
} from "../../../../../data/config_entries";
import {
  fetchZwaveDataCollectionStatus,
  fetchZwaveNetworkStatus,
  fetchZwaveProvisioningEntries,
  InclusionState,
  setZwaveDataCollectionPreference,
  stopZwaveExclusion,
  stopZwaveInclusion,
  subscribeZwaveControllerStatistics,
  ZWaveJSClient,
  ZWaveJSControllerStatisticsUpdatedMessage,
  ZWaveJSNetwork,
  ZwaveJSProvisioningEntry,
} from "../../../../../data/zwave_js";
import { showOptionsFlowDialog } from "../../../../../dialogs/config-flow/show-dialog-options-flow";
import "../../../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { showZWaveJSAddNodeDialog } from "./show-dialog-zwave_js-add-node";
import { showZWaveJSRebuildNetworkRoutesDialog } from "./show-dialog-zwave_js-rebuild-network-routes";
import { showZWaveJSRemoveNodeDialog } from "./show-dialog-zwave_js-remove-node";
import { configTabs } from "./zwave_js-config-router";

@customElement("zwave_js-config-dashboard")
class ZWaveJSConfigDashboard extends SubscribeMixin(LitElement) {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId!: string;

  @state() private _configEntry?: ConfigEntry;

  @state() private _network?: ZWaveJSNetwork;

  @state() private _provisioningEntries?: ZwaveJSProvisioningEntry[];

  @state() private _status?: ZWaveJSClient["state"];

  @state() private _icon = mdiCircle;

  @state() private _dataCollectionOptIn?: boolean;

  @state()
  private _statistics?: ZWaveJSControllerStatisticsUpdatedMessage;

  protected firstUpdated() {
    if (this.hass) {
      this._fetchData();
    }
  }

  public hassSubscribe(): Array<UnsubscribeFunc | Promise<UnsubscribeFunc>> {
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
        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.zwave_js.dashboard.header")}
          </div>

          <div slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.zwave_js.dashboard.introduction"
            )}
          </div>
          ${this._network &&
          this._status === "connected" &&
          (this._network?.controller.inclusion_state ===
            InclusionState.Including ||
            this._network?.controller.inclusion_state ===
              InclusionState.Excluding)
            ? html`
                <ha-alert alert-type="info">
                  ${this.hass.localize(
                    `ui.panel.config.zwave_js.common.in_progress_inclusion_exclusion`
                  )}
                  <mwc-button
                    slot="action"
                    .label=${this.hass.localize(
                      `ui.panel.config.zwave_js.common.cancel_inclusion_exclusion`
                    )}
                    @click=${this._network?.controller.inclusion_state ===
                    InclusionState.Including
                      ? this._cancelInclusion
                      : this._cancelExclusion}
                  >
                  </mwc-button>
                </ha-alert>
              `
            : ""}
          ${this._network
            ? html`
                <ha-card class="content network-status">
                  <div class="card-content">
                    <div class="heading">
                      <div class="icon">
                        ${this._status === "disconnected"
                          ? html`<ha-circular-progress
                              active
                            ></ha-circular-progress>`
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
                                    count:
                                      this._network.controller.nodes.length,
                                  }
                                )}
                                ${notReadyDevices > 0
                                  ? html`(${this.hass.localize(
                                      `ui.panel.config.zwave_js.dashboard.not_ready`,
                                      { count: notReadyDevices }
                                    )})`
                                  : ""}
                              </small>
                            </div>
                          `
                        : ``}
                    </div>
                  </div>
                  <div class="card-actions">
                    <a
                      href=${`/config/devices/dashboard?historyBack=1&config_entry=${this.configEntryId}`}
                    >
                      <mwc-button>
                        ${this.hass.localize("ui.panel.config.devices.caption")}
                      </mwc-button>
                    </a>
                    <a
                      href=${`/config/entities/dashboard?historyBack=1&config_entry=${this.configEntryId}`}
                    >
                      <mwc-button>
                        ${this.hass.localize(
                          "ui.panel.config.entities.caption"
                        )}
                      </mwc-button>
                    </a>
                    ${this._provisioningEntries?.length
                      ? html`<a
                          href=${`provisioned?config_entry=${this.configEntryId}`}
                          ><mwc-button>
                            ${this.hass.localize(
                              "ui.panel.config.zwave_js.dashboard.provisioned_devices"
                            )}
                          </mwc-button></a
                        >`
                      : ""}
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
                      <mwc-list noninteractive>
                        <mwc-list-item twoline hasmeta>
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
                        </mwc-list-item>
                        <mwc-list-item twoline hasmeta>
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
                        </mwc-list-item>
                        <mwc-list-item twoline hasmeta>
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
                        </mwc-list-item>
                        <mwc-list-item twoline hasmeta>
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
                        </mwc-list-item>
                        <mwc-list-item twoline hasmeta>
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
                        </mwc-list-item>
                        <mwc-list-item twoline hasmeta>
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
                        </mwc-list-item>
                        <mwc-list-item twoline hasmeta>
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
                        </mwc-list-item>
                        <mwc-list-item twoline hasmeta>
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
                        </mwc-list-item>
                        <mwc-list-item twoline hasmeta>
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
                        </mwc-list-item>
                      </mwc-list>
                    </ha-expansion-panel>
                  </div>
                  <div class="card-actions">
                    <mwc-button
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
                    </mwc-button>
                    <mwc-button
                      @click=${this._rebuildNetworkRoutesClicked}
                      .disabled=${this._status === "disconnected"}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.common.rebuild_network_routes"
                      )}
                    </mwc-button>
                    <mwc-button @click=${this._openOptionFlow}>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.common.reconfigure_server"
                      )}
                    </mwc-button>
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
                      : html`
                          <ha-circular-progress
                            size="small"
                            active
                          ></ha-circular-progress>
                        `}
                  </div>
                  <div class="card-content">
                    <p>
                      Enable the reporting of anonymized telemetry and
                      statistics to the <em>Z-Wave JS organization</em>. This
                      data will be used to focus development efforts and improve
                      the user experience. Information about the data that is
                      collected and how it is used, including an example of the
                      data collected, can be found in the
                      <a
                        target="_blank"
                        href="https://zwave-js.github.io/node-zwave-js/#/data-collection/data-collection"
                        >Z-Wave JS data collection documentation</a
                      >.
                    </p>
                  </div>
                </ha-card>
              `
            : ``}
        </ha-config-section>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.zwave_js.common.add_node"
          )}
          extended
          ?rtl=${computeRTL(this.hass)}
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
            <mwc-button @click=${this._handleBack}>
              ${this.hass?.localize("ui.common.back")}
            </mwc-button>
          </div>
        `
      : ""}`;
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
    showZWaveJSAddNodeDialog(this, {
      entry_id: this.configEntryId!,
      addedCallback: () => this._fetchData(),
    });
  }

  private async _removeNodeClicked() {
    showZWaveJSRemoveNodeDialog(this, {
      entry_id: this.configEntryId!,
    });
  }

  private async _rebuildNetworkRoutesClicked() {
    showZWaveJSRebuildNetworkRoutesDialog(this, {
      entry_id: this.configEntryId!,
    });
  }

  private async _cancelInclusion() {
    stopZwaveInclusion(this.hass!, this.configEntryId!);
    await this._fetchData();
  }

  private async _cancelExclusion() {
    stopZwaveExclusion(this.hass!, this.configEntryId!);
    await this._fetchData();
  }

  private _dataCollectionToggled(ev) {
    setZwaveDataCollectionPreference(
      this.hass!,
      this.configEntryId!,
      ev.target.checked
    );
  }

  private async _openOptionFlow() {
    if (!this.configEntryId) {
      return;
    }
    const configEntries = await getConfigEntries(this.hass, {
      domain: "zwave_js",
    });
    const configEntry = configEntries.find(
      (entry) => entry.entry_id === this.configEntryId
    );
    showOptionsFlowDialog(this, configEntry!);
  }

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
          font-weight: bold;
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

        mwc-list-item {
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

        [hidden] {
          display: none;
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
