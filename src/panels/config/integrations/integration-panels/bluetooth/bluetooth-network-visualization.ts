import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../../../../common/datetime/relative_time";
import { navigate } from "../../../../../common/navigate";
import { throttle } from "../../../../../common/util/throttle";
import "../../../../../components/chart/ha-network-graph";
import type {
  NetworkData,
  NetworkLink,
  NetworkNode,
} from "../../../../../components/chart/ha-network-graph";
import type {
  BluetoothDeviceData,
  BluetoothScannersDetails,
} from "../../../../../data/bluetooth";
import {
  subscribeBluetoothAdvertisements,
  subscribeBluetoothScannersDetails,
} from "../../../../../data/bluetooth";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import "../../../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../../../types";
import { bluetoothAdvertisementMonitorTabs } from "./bluetooth-advertisement-monitor";

const UPDATE_THROTTLE_TIME = 10000;

const CORE_SOURCE_ID = "ha";
const CORE_SOURCE_LABEL = "Home Assistant";

@customElement("bluetooth-network-visualization")
export class BluetoothNetworkVisualization extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _data: BluetoothDeviceData[] = [];

  @state() private _scanners: BluetoothScannersDetails = {};

  @state() private _sourceDevices: Record<string, DeviceRegistryEntry> = {};

  private _unsub_advertisements?: UnsubscribeFunc;

  private _unsub_scanners?: UnsubscribeFunc;

  private _throttledUpdateData = throttle((data: BluetoothDeviceData[]) => {
    this._data = data;
  }, UPDATE_THROTTLE_TIME);

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass) {
      this._unsub_advertisements = subscribeBluetoothAdvertisements(
        this.hass.connection,
        (data) => {
          if (!this._data.length) {
            this._data = data;
          } else {
            this._throttledUpdateData(data);
          }
        }
      );
      this._unsub_scanners = subscribeBluetoothScannersDetails(
        this.hass.connection,
        (scanners) => {
          this._scanners = scanners;
        }
      );

      const devices = Object.values(this.hass.devices);
      const bluetoothDevices = devices.filter((device) =>
        device.connections.find((connection) => connection[0] === "bluetooth")
      );
      this._sourceDevices = Object.fromEntries(
        bluetoothDevices.map((device) => {
          const connection = device.connections.find(
            (c) => c[0] === "bluetooth"
          )!;
          return [connection[1], device];
        })
      );
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub_advertisements) {
      this._unsub_advertisements();
      this._unsub_advertisements = undefined;
    }
    this._throttledUpdateData.cancel();
    if (this._unsub_scanners) {
      this._unsub_scanners();
      this._unsub_scanners = undefined;
    }
  }

  protected render() {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        header=${this.hass.localize("ui.panel.config.bluetooth.visualization")}
        .tabs=${bluetoothAdvertisementMonitorTabs}
      >
        <ha-network-graph
          .hass=${this.hass}
          .data=${this._formatNetworkData(this._data, this._scanners)}
          .tooltipFormatter=${this._tooltipFormatter}
          @chart-click=${this._handleChartClick}
        ></ha-network-graph>
      </hass-tabs-subpage>
    `;
  }

  private _formatNetworkData = memoizeOne(
    (
      data: BluetoothDeviceData[],
      scanners: BluetoothScannersDetails
    ): NetworkData => {
      const style = getComputedStyle(this);
      const categories = [
        {
          name: CORE_SOURCE_LABEL,
          symbol: "roundRect",
          itemStyle: {
            color: style.getPropertyValue("--primary-color"),
          },
        },
        {
          name: this.hass.localize("ui.panel.config.bluetooth.scanners"),
          symbol: "circle",
          itemStyle: {
            color: style.getPropertyValue("--cyan-color"),
          },
        },
        {
          name: this.hass.localize("ui.panel.config.bluetooth.known_devices"),
          symbol: "circle",
          itemStyle: {
            color: style.getPropertyValue("--teal-color"),
          },
        },
        {
          name: this.hass.localize("ui.panel.config.bluetooth.unknown_devices"),
          symbol: "circle",
          itemStyle: {
            color: style.getPropertyValue("--disabled-color"),
          },
        },
      ];
      const nodes: NetworkNode[] = [
        {
          id: CORE_SOURCE_ID,
          name: CORE_SOURCE_LABEL,
          category: 0,
          value: 4,
          symbol: "roundRect",
          symbolSize: 40,
          polarDistance: 0,
        },
      ];
      const links: NetworkLink[] = [];
      Object.values(scanners).forEach((scanner) => {
        const scannerDevice = this._sourceDevices[scanner.source];
        nodes.push({
          id: scanner.source,
          name:
            scannerDevice?.name_by_user || scannerDevice?.name || scanner.name,
          category: 1,
          value: 5,
          symbol: "circle",
          symbolSize: 30,
          polarDistance: 0.25,
        });
        links.push({
          source: CORE_SOURCE_ID,
          target: scanner.source,
          value: 0,
          symbol: "none",
          lineStyle: {
            width: 3,
            color: style.getPropertyValue("--primary-color"),
          },
        });
      });
      data.forEach((node) => {
        if (scanners[node.address]) {
          // proxies sometimes appear as end devices too
          links.push({
            source: node.source,
            target: node.address,
            value: node.rssi,
            symbol: "none",
            lineStyle: {
              width: this._getLineWidth(node.rssi),
              color: style.getPropertyValue("--primary-color"),
            },
          });
          return;
        }
        const device = this._sourceDevices[node.address];
        nodes.push({
          id: node.address,
          name: this._getBluetoothDeviceName(node.address),
          value: device ? 1 : 0,
          category: device ? 2 : 3,
          symbolSize: 20,
        });
        links.push({
          source: node.source,
          target: node.address,
          value: node.rssi,
          symbol: "none",
          lineStyle: {
            width: this._getLineWidth(node.rssi),
            color: device
              ? style.getPropertyValue("--primary-color")
              : style.getPropertyValue("--disabled-color"),
          },
        });
      });
      return { nodes, links, categories };
    }
  );

  private _getBluetoothDeviceName(id: string): string {
    if (id === CORE_SOURCE_ID) {
      return CORE_SOURCE_LABEL;
    }
    if (this._sourceDevices[id]) {
      return (
        this._sourceDevices[id]?.name_by_user ||
        this._sourceDevices[id]?.name ||
        id
      );
    }
    if (this._scanners[id]) {
      return this._scanners[id]?.name || id;
    }
    return this._data.find((d) => d.address === id)?.name || id;
  }

  private _getLineWidth(rssi: number): number {
    return rssi > -33 ? 3 : rssi > -66 ? 2 : 1;
  }

  private _tooltipFormatter = (params: TopLevelFormatterParams): string => {
    const { dataType, data } = params as CallbackDataParams;
    let tooltipText = "";
    if (dataType === "edge") {
      const { source, target, value } = data as any;
      const sourceName = this._getBluetoothDeviceName(source);
      const targetName = this._getBluetoothDeviceName(target);
      tooltipText = `${sourceName} → ${targetName}`;
      if (source !== CORE_SOURCE_ID) {
        tooltipText += ` <b>${this.hass.localize("ui.panel.config.bluetooth.rssi")}:</b> ${value}`;
      }
    } else {
      const { id: address } = data as any;
      const name = this._getBluetoothDeviceName(address);
      const btDevice = this._data.find((d) => d.address === address);
      if (btDevice) {
        tooltipText = `<b>${name}</b><br><b>${this.hass.localize("ui.panel.config.bluetooth.address")}:</b> ${address}<br><b>${this.hass.localize("ui.panel.config.bluetooth.rssi")}:</b> ${btDevice.rssi}<br><b>${this.hass.localize("ui.panel.config.bluetooth.source")}:</b> ${btDevice.source}<br><b>${this.hass.localize("ui.panel.config.bluetooth.updated")}:</b> ${relativeTime(new Date(btDevice.time * 1000), this.hass.locale)}`;
      } else {
        const device = this._sourceDevices[address];
        if (device) {
          tooltipText = `<b>${name}</b><br><b>${this.hass.localize("ui.panel.config.bluetooth.address")}:</b> ${address}`;
          if (device.area_id) {
            const area = this.hass.areas[device.area_id];
            if (area) {
              tooltipText += `<br><b>${this.hass.localize("ui.panel.config.bluetooth.area")}: </b>${area.name}`;
            }
          }
        }
      }
    }
    return tooltipText;
  };

  private _handleChartClick(e: CustomEvent): void {
    if (
      e.detail.dataType === "node" &&
      e.detail.event.target.cursor === "pointer"
    ) {
      const { id } = e.detail.data;
      const device = this._sourceDevices[id];
      if (device) {
        navigate(`/config/devices/device/${device.id}`);
      }
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-network-graph {
          height: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bluetooth-network-visualization": BluetoothNetworkVisualization;
  }
}
