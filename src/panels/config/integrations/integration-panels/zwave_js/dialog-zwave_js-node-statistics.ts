import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiSwapHorizontal } from "@mdi/js";
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
import { fireEvent } from "../../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-help-tooltip";
import "../../../../../components/ha-svg-icon";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../../../data/device_registry";
import {
  ProtocolDataRate,
  RssiError,
  subscribeZwaveNodeStatistics,
  ZWaveJSNodeStatisticsUpdatedMessage,
  ZWaveJSRouteStatistics,
} from "../../../../../data/zwave_js";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSNodeStatisticsDialogParams } from "./show-dialog-zwave_js-node-statistics";

type WorkingRouteStatistics =
  | (ZWaveJSRouteStatistics & {
      repeater_rssi_table?: TemplateResult;
      rssi_translated?: TemplateResult | string;
      route_failed_between_translated?: [string, string];
    })
  | undefined;

@customElement("dialog-zwave_js-node-statistics")
class DialogZWaveJSNodeStatistics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device?: DeviceRegistryEntry;

  @state() private _nodeStatistics?: ZWaveJSNodeStatisticsUpdatedMessage & {
    rssi_translated?: TemplateResult | string;
  };

  @state() private _deviceIDsToName: { [key: string]: string } = {};

  @state() private _workingRoutes: {
    lwr?: WorkingRouteStatistics;
    nlwr?: WorkingRouteStatistics;
  } = {};

  private _subscribedNodeStatistics?: Promise<UnsubscribeFunc>;

  private _subscribedDeviceRegistry?: UnsubscribeFunc;

  public showDialog(params: ZWaveJSNodeStatisticsDialogParams): void {
    this.device = params.device;
    this._subscribeDeviceRegistry();
    this._subscribeNodeStatistics();
  }

  public closeDialog(): void {
    this._nodeStatistics = undefined;
    this.device = undefined;

    this._unsubscribe();

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this.device) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.zwave_js.node_statistics.title")
        )}
      >
        <mwc-list noninteractive>
          <mwc-list-item twoline hasmeta>
            <span>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_statistics.commands_tx.label"
              )}</span
            >
            <span slot="secondary">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_statistics.commands_tx.tooltip"
              )}
            </span>
            <span slot="meta">${this._nodeStatistics?.commands_tx}</span>
          </mwc-list-item>
          <mwc-list-item twoline hasmeta>
            <span>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_statistics.commands_rx.label"
              )}</span
            >
            <span slot="secondary">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_statistics.commands_rx.tooltip"
              )}
            </span>
            <span slot="meta">${this._nodeStatistics?.commands_rx}</span>
          </mwc-list-item>
          <mwc-list-item twoline hasmeta>
            <span>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_statistics.commands_dropped_tx.label"
              )}</span
            >
            <span slot="secondary">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_statistics.commands_dropped_tx.tooltip"
              )}
            </span>
            <span slot="meta"
              >${this._nodeStatistics?.commands_dropped_tx}</span
            >
          </mwc-list-item>
          <mwc-list-item twoline hasmeta>
            <span>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_statistics.commands_dropped_rx.label"
              )}</span
            >
            <span slot="secondary">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_statistics.commands_dropped_rx.tooltip"
              )}
            </span>
            <span slot="meta"
              >${this._nodeStatistics?.commands_dropped_rx}</span
            >
          </mwc-list-item>
          <mwc-list-item twoline hasmeta>
            <span>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_statistics.timeout_response.label"
              )}</span
            >
            <span slot="secondary">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_statistics.timeout_response.tooltip"
              )}
            </span>
            <span slot="meta">${this._nodeStatistics?.timeout_response}</span>
          </mwc-list-item>
          ${this._nodeStatistics?.rtt
            ? html`<mwc-list-item twoline hasmeta>
                <span>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.node_statistics.rtt.label"
                  )}</span
                >
                <span slot="secondary">
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.node_statistics.rtt.tooltip"
                  )}
                </span>
                <span slot="meta">${this._nodeStatistics.rtt}</span>
              </mwc-list-item>`
            : ``}
          ${this._nodeStatistics?.rssi_translated
            ? html`<mwc-list-item twoline hasmeta>
                <span>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.node_statistics.rssi.label"
                  )}</span
                >
                <span slot="secondary">
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.node_statistics.rssi.tooltip"
                  )}
                </span>
                <span slot="meta">${this._nodeStatistics.rssi_translated}</span>
              </mwc-list-item>`
            : ``}
        </mwc-list>
        ${Object.entries(this._workingRoutes).map(([wrKey, wrValue]) =>
          wrValue
            ? html`
                <ha-expansion-panel
                  .header=${this.hass.localize(
                    `ui.panel.config.zwave_js.node_statistics.${wrKey}`
                  )}
                >
                  <div class="row">
                    <span>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.route_statistics.protocol.label"
                      )}<ha-help-tooltip
                        .label=${this.hass.localize(
                          "ui.panel.config.zwave_js.route_statistics.protocol.tooltip"
                        )}
                      >
                      </ha-help-tooltip
                    ></span>
                    <span
                      >${this.hass.localize(
                        `ui.panel.config.zwave_js.route_statistics.protocol.protocol_data_rate.${
                          ProtocolDataRate[wrValue.protocol_data_rate]
                        }`
                      )}</span
                    >
                  </div>
                  <div class="row">
                    <span>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.route_statistics.data_rate.label"
                      )}<ha-help-tooltip
                        .label=${this.hass.localize(
                          "ui.panel.config.zwave_js.route_statistics.data_rate.tooltip"
                        )}
                      >
                      </ha-help-tooltip
                    ></span>
                    <span
                      >${this.hass.localize(
                        `ui.panel.config.zwave_js.route_statistics.data_rate.protocol_data_rate.${
                          ProtocolDataRate[wrValue.protocol_data_rate]
                        }`
                      )}</span
                    >
                  </div>
                  ${wrValue.rssi_translated
                    ? html`<div class="row">
                        <span>
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.route_statistics.rssi.label"
                          )}<ha-help-tooltip
                            .label=${this.hass.localize(
                              "ui.panel.config.zwave_js.route_statistics.rssi.tooltip"
                            )}
                          >
                          </ha-help-tooltip
                        ></span>
                        <span>${wrValue.rssi_translated}</span>
                      </div>`
                    : ``}
                  <div class="row">
                    <span>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.route_statistics.route_failed_between.label"
                      )}<ha-help-tooltip
                        .label=${this.hass.localize(
                          "ui.panel.config.zwave_js.route_statistics.route_failed_between.tooltip"
                        )}
                      >
                      </ha-help-tooltip
                    ></span>
                    <span>
                      ${wrValue.route_failed_between_translated
                        ? html`${wrValue
                              .route_failed_between_translated[0]}<ha-svg-icon
                              .path=${mdiSwapHorizontal}
                            ></ha-svg-icon
                            >${wrValue.route_failed_between_translated[1]}`
                        : this.hass.localize(
                            "ui.panel.config.zwave_js.route_statistics.route_failed_between.not_applicable"
                          )}
                    </span>
                  </div>
                  <div class="row">
                    <span>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.route_statistics.repeaters.label"
                      )}<ha-help-tooltip
                        .label=${this.hass.localize(
                          "ui.panel.config.zwave_js.route_statistics.repeaters.tooltip"
                        )}
                      >
                      </ha-help-tooltip></span
                    ><span>
                      ${wrValue.repeater_rssi_table
                        ? html`<div class="row">
                              <span class="key-cell"
                                ><b
                                  >${this.hass.localize(
                                    "ui.panel.config.zwave_js.route_statistics.repeaters.repeaters"
                                  )}:</b
                                ></span
                              >
                              <span class="value-cell"
                                ><b
                                  >${this.hass.localize(
                                    "ui.panel.config.zwave_js.route_statistics.repeaters.rssi"
                                  )}:</b
                                ></span
                              >
                            </div>
                            ${wrValue.repeater_rssi_table}`
                        : html`${this.hass.localize(
                            "ui.panel.config.zwave_js.route_statistics.repeaters.direct"
                          )}`}</span
                    >
                  </div>
                </ha-expansion-panel>
              `
            : ``
        )}
      </ha-dialog>
    `;
  }

  private _computeRSSI(
    rssi: number,
    includeUnit: boolean
  ): TemplateResult | string {
    if (Object.values(RssiError).includes(rssi)) {
      return html`<ha-help-tooltip
        .label=${this.hass.localize(
          `ui.panel.config.zwave_js.rssi.rssi_error.${RssiError[rssi]}`
        )}
      ></ha-help-tooltip>`;
    }
    if (includeUnit) {
      return `${rssi}
      ${this.hass.localize("ui.panel.config.zwave_js.rssi.unit")}`;
    }
    return rssi.toString();
  }

  private _computeDeviceNameById(device_id: string): "unknown device" | string {
    if (!this._deviceIDsToName) {
      return "unknown device";
    }
    const device = this._deviceIDsToName[device_id];
    if (!device) {
      return "unknown device";
    }

    return this._deviceIDsToName[device_id] || "unknown device";
  }

  private _subscribeNodeStatistics(): void {
    if (!this.hass) {
      return;
    }
    this._subscribedNodeStatistics = subscribeZwaveNodeStatistics(
      this.hass,
      this.device!.id,
      (message: ZWaveJSNodeStatisticsUpdatedMessage) => {
        this._nodeStatistics = {
          ...message,
          rssi_translated: message.rssi
            ? this._computeRSSI(message.rssi, false)
            : undefined,
        };

        const workingRoutesValueMap: [
          string,
          WorkingRouteStatistics | null | undefined,
        ][] = [
          ["lwr", this._nodeStatistics?.lwr],
          ["nlwr", this._nodeStatistics?.nlwr],
        ];

        const workingRoutes: {
          lwr?: WorkingRouteStatistics;
          nlwr?: WorkingRouteStatistics;
        } = {};
        workingRoutesValueMap.forEach(([wrKey, wrValue]) => {
          workingRoutes[wrKey] = wrValue;

          if (wrValue) {
            if (wrValue.rssi) {
              wrValue.rssi_translated = this._computeRSSI(wrValue.rssi, true);
            }

            if (wrValue.route_failed_between) {
              wrValue.route_failed_between_translated = [
                this._computeDeviceNameById(wrValue.route_failed_between[0]),
                this._computeDeviceNameById(wrValue.route_failed_between[1]),
              ];
            }

            if (wrValue.repeaters && wrValue.repeaters.length) {
              wrValue.repeater_rssi_table = html`${wrValue.repeaters.map(
                (_, idx) =>
                  html`<div class="row">
                    <span class="key-cell"
                      >${this._computeDeviceNameById(
                        wrValue.repeaters[idx]
                      )}:</span
                    >
                    <span class="value-cell"
                      >${this._computeRSSI(
                        wrValue.repeater_rssi[idx],
                        true
                      )}</span
                    >
                  </div>`
              )}`;
            }
          }
        });
        this._workingRoutes = workingRoutes;
      }
    );
  }

  private _subscribeDeviceRegistry(): void {
    if (!this.hass) {
      return;
    }
    this._subscribedDeviceRegistry = subscribeDeviceRegistry(
      this.hass.connection,
      (devices: DeviceRegistryEntry[]) => {
        const devicesIdToName = {};
        devices.forEach((device) => {
          devicesIdToName[device.id] = computeDeviceName(device, this.hass);
        });
        this._deviceIDsToName = devicesIdToName;
      }
    );
  }

  private _unsubscribe(): void {
    if (this._subscribedNodeStatistics) {
      this._subscribedNodeStatistics.then((unsub) => unsub());
      this._subscribedNodeStatistics = undefined;
    }
    if (this._subscribedDeviceRegistry) {
      this._subscribedDeviceRegistry();
      this._subscribedDeviceRegistry = undefined;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        mwc-list-item {
          height: 60px;
        }

        .row {
          display: flex;
          justify-content: space-between;
        }

        .table {
          display: table;
        }

        .key-cell {
          display: table-cell;
          padding-right: 5px;
        }

        .value-cell {
          display: table-cell;
          padding-left: 5px;
        }

        span[slot="meta"] {
          font-size: 0.95em;
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zwave_js-node-statistics": DialogZWaveJSNodeStatistics;
  }
}
