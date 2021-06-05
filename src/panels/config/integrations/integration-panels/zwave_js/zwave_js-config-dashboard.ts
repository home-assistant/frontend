import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import { mdiCheckCircle, mdiCircle, mdiRefresh } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-svg-icon";
import { getSignedPath } from "../../../../../data/auth";
import {
  fetchDataCollectionStatus,
  fetchNetworkStatus,
  fetchNodeStatus,
  NodeStatus,
  setDataCollectionPreference,
  ZWaveJSNetwork,
  ZWaveJSNode,
} from "../../../../../data/zwave_js";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { fileDownload } from "../../../../../util/filedownload";
import "../../../ha-config-section";
import { showZWaveJSAddNodeDialog } from "./show-dialog-zwave_js-add-node";
import { showZWaveJSRemoveNodeDialog } from "./show-dialog-zwave_js-remove-node";
import { configTabs } from "./zwave_js-config-router";

@customElement("zwave_js-config-dashboard")
class ZWaveJSConfigDashboard extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @state() private _network?: ZWaveJSNetwork;

  @state() private _nodes?: ZWaveJSNode[];

  @state() private _status = "unknown";

  @state() private _icon = mdiCircle;

  @state() private _dataCollectionOptIn?: boolean;

  protected firstUpdated() {
    if (this.hass) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configTabs}
      >
        <mwc-icon-button slot="toolbar-icon" @click=${this._fetchData}>
          <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
        </mwc-icon-button>
        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.zwave_js.dashboard.header")}
          </div>

          <div slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.zwave_js.dashboard.introduction"
            )}
          </div>
          ${this._network
            ? html`
                <ha-card class="content network-status">
                  <div class="card-content">
                    <div class="heading">
                      <div class="icon">
                        ${this._status === "connecting"
                          ? html`<ha-circular-progress
                              active
                            ></ha-circular-progress>`
                          : html`
                              <ha-svg-icon
                                .path=${this._icon}
                                class="network-status-icon ${classMap({
                                  [this._status]: true,
                                })}"
                                slot="item-icon"
                              ></ha-svg-icon>
                            `}
                      </div>
                      ${this._status !== "connecting"
                        ? html`
                            <div class="details">
                              ${this.hass.localize(
                                "ui.panel.config.zwave_js.common.network"
                              )}
                              ${this.hass.localize(
                                `ui.panel.config.zwave_js.network_status.${this._status}`
                              )}<br />
                              <small
                                >${this._network.client.ws_server_url}</small
                              >
                            </div>
                          `
                        : ``}
                    </div>
                    <div class="secondary">
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.driver_version"
                      )}:
                      ${this._network.client.driver_version}<br />
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.server_version"
                      )}:
                      ${this._network.client.server_version}<br />
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.home_id"
                      )}:
                      ${this._network.controller.home_id}<br />
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.nodes_ready"
                      )}:
                      ${this._nodes?.filter((node) => node.ready).length ?? 0} /
                      ${this._network.controller.nodes.length}
                    </div>
                  </div>
                  <div class="card-actions">
                    <a
                      href="${`/config/devices/dashboard?historyBack=1&config_entry=${this.configEntryId}`}"
                    >
                      <mwc-button>
                        ${this.hass.localize("ui.panel.config.devices.caption")}
                      </mwc-button>
                    </a>
                    <a
                      href="${`/config/entities/dashboard?historyBack=1&config_entry=${this.configEntryId}`}"
                    >
                      <mwc-button>
                        ${this.hass.localize(
                          "ui.panel.config.entities.caption"
                        )}
                      </mwc-button>
                    </a>
                    <mwc-button @click=${this._addNodeClicked}>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.common.add_node"
                      )}
                    </mwc-button>
                    <mwc-button @click=${this._removeNodeClicked}>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.common.remove_node"
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
                        href="https://zwave-js.github.io/node-zwave-js/#/data-collection/data-collection?id=usage-statistics"
                        >Z-Wave JS data collection documentation</a
                      >.
                    </p>
                  </div>
                </ha-card>
              `
            : ``}
          <button class="link dump" @click=${this._dumpDebugClicked}>
            ${this.hass.localize(
              "ui.panel.config.zwave_js.dashboard.dump_debug"
            )}
          </button>
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  private async _fetchData() {
    if (!this.configEntryId) {
      return;
    }
    const [network, dataCollectionStatus] = await Promise.all([
      fetchNetworkStatus(this.hass!, this.configEntryId),
      fetchDataCollectionStatus(this.hass!, this.configEntryId),
    ]);

    this._network = network;

    this._status = this._network.client.state;
    if (this._status === "connected") {
      this._icon = mdiCheckCircle;
    }

    this._dataCollectionOptIn =
      dataCollectionStatus.opted_in === true ||
      dataCollectionStatus.enabled === true;

    this._fetchNodeStatus();
  }

  private async _fetchNodeStatus() {
    if (!this._network) {
      return;
    }
    const nodeStatePromisses = this._network.controller.nodes.map((nodeId) =>
      fetchNodeStatus(this.hass, this.configEntryId!, nodeId)
    );
    this._nodes = await Promise.all(nodeStatePromisses);
  }

  private async _addNodeClicked() {
    showZWaveJSAddNodeDialog(this, {
      entry_id: this.configEntryId!,
    });
  }

  private async _removeNodeClicked() {
    showZWaveJSRemoveNodeDialog(this, {
      entry_id: this.configEntryId!,
    });
  }

  private _dataCollectionToggled(ev) {
    setDataCollectionPreference(
      this.hass!,
      this.configEntryId!,
      ev.target.checked
    );
  }

  private async _dumpDebugClicked() {
    await this._fetchNodeStatus();

    const notReadyNodes = this._nodes?.filter((node) => !node.ready);
    const deadNodes = this._nodes?.filter(
      (node) => node.status === NodeStatus.Dead
    );

    if (deadNodes?.length) {
      await showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.dump_dead_nodes_title"
        ),
        text: this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.dump_dead_nodes_text"
        ),
      });
    }

    if (
      notReadyNodes?.length &&
      notReadyNodes.length !== deadNodes?.length &&
      !(await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.dump_not_ready_title"
        ),
        text: this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.dump_not_ready_text"
        ),
        confirmText: this.hass.localize(
          "ui.panel.config.zwave_js.dashboard.dump_not_ready_confirm"
        ),
      }))
    ) {
      return;
    }

    let signedPath: { path: string };
    try {
      signedPath = await getSignedPath(
        this.hass,
        `/api/zwave_js/dump/${this.configEntryId}`
      );
    } catch (err) {
      showAlertDialog(this, {
        title: "Error",
        text: err.error || err.body || err,
      });
      return;
    }

    fileDownload(this, signedPath.path, `zwave_js_dump.jsonl`);
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

        .content {
          margin-top: 24px;
        }

        .sectionHeader {
          position: relative;
          padding-right: 40px;
        }

        .network-status div.heading {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
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

        button.dump {
          width: 100%;
          text-align: center;
          color: var(--secondary-text-color);
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
