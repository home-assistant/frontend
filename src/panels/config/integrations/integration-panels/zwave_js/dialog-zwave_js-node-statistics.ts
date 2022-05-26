import { UnsubscribeFunc } from "home-assistant-js-websocket";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-help-tooltip";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import {
  DeviceRegistryEntry,
  computeDeviceName,
  subscribeDeviceRegistry,
} from "../../../../../data/device_registry";
import {
  subscribeZwaveNodeStatistics,
  ProtocolDataRate,
  ZWaveJSNodeStatisticsUpdatedMessage,
  ZWaveJSRouteStatistics,
  RssiError,
} from "../../../../../data/zwave_js";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSNodeStatisticsDialogParams } from "./show-dialog-zwave_js-node-statistics";
import { createCloseHeading } from "../../../../../components/ha-dialog";

@customElement("dialog-zwave_js-node-statistics")
class DialogZWaveJSNodeStatistics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device?: DeviceRegistryEntry;

  @state() private _nodeStatistics?: ZWaveJSNodeStatisticsUpdatedMessage;

  @state() private _devices?: DeviceRegistryEntry[];

  private _subscribedNodeStatistics?: Promise<UnsubscribeFunc>;

  private _subscribedDeviceRegistry?: UnsubscribeFunc;

  public showDialog(params: ZWaveJSNodeStatisticsDialogParams): void {
    this.device = params.device;
    this._subscribeNodeStatistics();
    this._subscribeDeviceRegistry();
  }

  public closeDialog(): void {
    this._nodeStatistics = undefined;
    this.device = undefined;

    this._unsubscribe();

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this.device) {
      return html``;
    }

    const workingRoutes: [ZWaveJSRouteStatistics | null | undefined, string][] =
      [
        [this._nodeStatistics?.lwr, "lwr"],
        [this._nodeStatistics?.nlwr, "nlwr"],
      ];

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
                <span slot="meta">${this._nodeStatistics?.rtt}</span>
              </mwc-list-item>`
            : ``}
          ${this._nodeStatistics?.rssi
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
                <span slot="meta"
                  >${this._computeRSSI(this._nodeStatistics?.rssi, false)}</span
                >
              </mwc-list-item>`
            : ``}
        </mwc-list>
        ${workingRoutes.map(([wrValue, wrLabel]) => {
          if (wrValue) {
            const wrRepeaterRSSIMap: { [key: string]: string } = {};
            for (let idx = 0; idx < wrValue.repeaters.length; idx++) {
              wrRepeaterRSSIMap[
                this._computeDeviceNameById(wrValue.repeaters[idx])
              ] = this._computeRSSI(wrValue.repeater_rssi[idx], true);
            }

            return html`
              <ha-expansion-panel
                .header=${this.hass.localize(
                  `ui.panel.config.zwave_js.node_statistics.${wrLabel}`
                )}
              >
                <div class="row">
                  <span>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.route_statistics.protocol_data_rate.label"
                    )}<ha-help-tooltip
                      .label=${this.hass.localize(
                        "ui.panel.config.zwave_js.route_statistics.protocol_data_rate.tooltip"
                      )}
                    >
                    </ha-help-tooltip
                  ></span>
                  <span
                    >${this.hass.localize(
                      `ui.panel.config.zwave_js.protocol_data_rate.${
                        ProtocolDataRate[wrValue.protocol_data_rate]
                      }`
                    )}</span
                  >
                </div>
                ${wrValue.rssi
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
                      <span>${this._computeRSSI(wrValue.rssi, true)}</span>
                    </div>`
                  : ``}
                ${wrValue.route_failed_between
                  ? html`<div class="row">
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
                      <span
                        >${`${this._computeDeviceNameById(
                          wrValue.route_failed_between[0]
                        )} <-> ${this._computeDeviceNameById(
                          wrValue.route_failed_between[1]
                        )}`}</span
                      >
                    </div>`
                  : ``}
                ${wrValue.repeaters.length > 0
                  ? html`<div class="row">
                      <span>
                        ${this.hass.localize(
                          "ui.panel.config.zwave_js.route_statistics.repeaters.label"
                        )}<ha-help-tooltip
                          .label=${this.hass.localize(
                            "ui.panel.config.zwave_js.route_statistics.repeaters.tooltip"
                          )}
                        >
                        </ha-help-tooltip
                      ></span>
                      <span
                        >${Object.entries(wrRepeaterRSSIMap).map(
                          ([repeaterName, rssi]) => html`
                            <div class="row">
                              <span>${repeaterName}: </span>
                              <span>${rssi}</span>
                            </div>
                          `
                        )}</span
                      >
                    </div>`
                  : ``}
              </ha-expansion-panel>
            `;
          }
          return ``;
        })}
      </ha-dialog>
    `;
  }

  private _computeRSSI(rssi: number, includeUnit: boolean): string {
    if (Object.values(RssiError).includes(rssi)) {
      return this.hass.localize(
        `ui.panel.config.zwave_js.rssi.rssi_error.${RssiError[rssi]}`
      );
    }
    if (includeUnit) {
      return `${rssi} ${this.hass.localize(
        "ui.panel.config.zwave_js.rssi.unit"
      )}`;
    }
    return rssi.toString();
  }

  private _computeDeviceNameById(device_id: string): string {
    if (!this._devices) {
      return device_id;
    }
    const device = this._devices.find((dev) => dev.id === device_id);
    if (!device) {
      return device_id;
    }

    return computeDeviceName(device, this.hass);
  }

  private _subscribeNodeStatistics(): void {
    if (!this.hass) {
      return;
    }
    this._subscribedNodeStatistics = subscribeZwaveNodeStatistics(
      this.hass,
      this.device!.id,
      (message: ZWaveJSNodeStatisticsUpdatedMessage) => {
        this._nodeStatistics = message;
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
        this._devices = devices;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zwave_js-node-statistics": DialogZWaveJSNodeStatistics;
  }
}
