import { customElement, property, state } from "lit/decorators";
import { css, html, LitElement } from "lit";
import memoizeOne from "memoize-one";
import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import type { HomeAssistant, Route } from "../../../../../types";
import { configTabs } from "./zwave_js-config-router";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import type {
  NetworkData,
  NetworkLink,
  NetworkNode,
} from "../../../../../components/chart/ha-network-graph";
import "../../../../../components/chart/ha-network-graph";
import "../../../../../layouts/hass-tabs-subpage";
import {
  fetchZwaveNetworkStatus,
  NodeStatus,
  subscribeZwaveNodeStatistics,
} from "../../../../../data/zwave_js";
import type {
  ZWaveJSNodeStatisticsUpdatedMessage,
  ZWaveJSNodeStatus,
} from "../../../../../data/zwave_js";
import { colorVariables } from "../../../../../resources/theme/color.globals";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import { debounce } from "../../../../../common/util/debounce";
import { navigate } from "../../../../../common/navigate";

@customElement("zwave_js-network-visualization")
export class ZWaveJSNetworkVisualization extends SubscribeMixin(LitElement) {
  public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public configEntryId!: string;

  @state() private _nodeStatuses: Record<number, ZWaveJSNodeStatus> = {};

  @state() private _nodeStatistics: Record<
    number,
    ZWaveJSNodeStatisticsUpdatedMessage
  > = {};

  @state() private _devices: Record<string, DeviceRegistryEntry> = {};

  public hassSubscribe() {
    const devices = Object.values(this.hass.devices).filter((device) =>
      device.config_entries.some((entry) => entry === this.configEntryId)
    );

    return devices.map((device) =>
      subscribeZwaveNodeStatistics(this.hass!, device.id, (message) => {
        const nodeId = message.nodeId ?? message.node_id;
        this._devices[nodeId!] = device;
        this._nodeStatistics[nodeId!] = message;
        this._handleUpdatedNodeStatistics();
      })
    );
  }

  public connectedCallback() {
    super.connectedCallback();
    this._fetchNetworkStatus();
  }

  protected render() {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configTabs}
      >
        <ha-network-graph
          .hass=${this.hass}
          .data=${this._getNetworkData(
            this._nodeStatuses,
            this._nodeStatistics
          )}
          .tooltipFormatter=${this._tooltipFormatter}
          @chart-click=${this._handleChartClick}
        ></ha-network-graph
      ></hass-tabs-subpage>
    `;
  }

  private async _fetchNetworkStatus() {
    const network = await fetchZwaveNetworkStatus(this.hass!, {
      entry_id: this.configEntryId,
    });
    const nodeStatuses: Record<number, ZWaveJSNodeStatus> = {};
    network.controller.nodes.forEach((node) => {
      nodeStatuses[node.node_id] = node;
    });

    this._nodeStatuses = nodeStatuses;
  }

  private _tooltipFormatter = (params: TopLevelFormatterParams): string => {
    const { dataType, data } = params as CallbackDataParams;
    if (dataType === "edge") {
      const { source, target, value } = data as any;
      const sourceDevice = this._devices[source];
      const targetDevice = this._devices[target];
      const sourceName =
        sourceDevice?.name_by_user ?? sourceDevice?.name ?? source;
      const targetName =
        targetDevice?.name_by_user ?? targetDevice?.name ?? target;
      let tip = `${sourceName} → ${targetName}`;
      const route =
        this._nodeStatistics[source]?.lwr || this._nodeStatistics[source]?.nlwr;
      if (route?.protocol_data_rate) {
        tip += `<br><b>${this.hass.localize("ui.panel.config.zwave_js.visualization.data_rate")}:</b> ${this.hass.localize(`ui.panel.config.zwave_js.protocol_data_rate.${route.protocol_data_rate}`)}`;
      }
      if (value) {
        tip += `<br><b>RSSI:</b> ${value}`;
      }
      return tip;
    }
    const { id, name } = data as any;
    const device = this._devices[id];
    const nodeStatus = this._nodeStatuses[id];
    let tip = `${(params as any).marker} ${name}`;
    tip += `<br><b>${this.hass.localize("ui.panel.config.zwave_js.visualization.node_id")}:</b> ${id}`;
    if (device) {
      tip += `<br><b>${this.hass.localize("ui.panel.config.zwave_js.visualization.manufacturer")}:</b> ${device.manufacturer || "-"}`;
      tip += `<br><b>${this.hass.localize("ui.panel.config.zwave_js.visualization.model")}:</b> ${device.model || "-"}`;
    }
    if (nodeStatus) {
      tip += `<br><b>${this.hass.localize("ui.panel.config.zwave_js.visualization.status")}:</b> ${this.hass.localize(`ui.panel.config.zwave_js.node_status.${nodeStatus.status}`)}`;
      if (nodeStatus.zwave_plus_version) {
        tip += `<br><b>Z-Wave Plus:</b> ${this.hass.localize("ui.panel.config.zwave_js.visualization.version")} ${nodeStatus.zwave_plus_version}`;
      }
    }
    return tip;
  };

  private _getNetworkData = memoizeOne(
    (
      nodeStatuses: Record<number, ZWaveJSNodeStatus>,
      nodeStatistics: Record<number, ZWaveJSNodeStatisticsUpdatedMessage>
    ): NetworkData => {
      const nodes: NetworkNode[] = [];
      const links: NetworkLink[] = [];
      const categories = [
        {
          name: this.hass.localize(
            "ui.panel.config.zwave_js.visualization.controller"
          ),
          symbol: "roundRect",
          itemStyle: {
            color: colorVariables["primary-color"],
          },
        },
        {
          name: this.hass.localize(
            "ui.panel.config.zwave_js.visualization.node"
          ),
          symbol: "circle",
          itemStyle: {
            color: colorVariables["cyan-color"],
          },
        },
        {
          name: this.hass.localize(
            "ui.panel.config.zwave_js.visualization.asleep_node"
          ),
          symbol: "circle",
          itemStyle: {
            color: colorVariables["disabled-color"],
          },
        },
        {
          name: this.hass.localize(
            "ui.panel.config.zwave_js.visualization.dead_node"
          ),
          symbol: "circle",
          itemStyle: {
            color: colorVariables["error-color"],
          },
        },
      ];
      if (!Object.keys(nodeStatuses).length) {
        return { nodes, links, categories };
      }

      let controllerNode: number | undefined;
      Object.values(nodeStatuses).forEach((node) => {
        if (node.is_controller_node) {
          controllerNode = node.node_id;
        }
        const device = this._devices[node.node_id];
        nodes.push({
          id: String(node.node_id),
          name: device?.name_by_user ?? device?.name ?? String(node.node_id),
          value: node.is_controller_node ? 3 : node.is_routing ? 2 : 1,
          category:
            node.status === NodeStatus.Dead
              ? 3
              : node.status === NodeStatus.Asleep
                ? 2
                : node.is_controller_node
                  ? 0
                  : 1,
          symbolSize: node.is_controller_node ? 40 : node.is_routing ? 30 : 20,
          symbol: node.is_controller_node ? "roundRect" : "circle",
          itemStyle: {
            color:
              node.status === NodeStatus.Dead
                ? colorVariables["error-color"]
                : node.status === NodeStatus.Asleep
                  ? colorVariables["disabled-color"]
                  : node.is_controller_node
                    ? colorVariables["primary-color"]
                    : colorVariables["cyan-color"],
          },
          polarDistance: node.is_controller_node
            ? 0
            : node.status === NodeStatus.Dead
              ? 0.9
              : 0.5,
          fixed: node.is_controller_node,
        });
      });

      Object.entries(nodeStatistics).forEach(([nodeId, stats]) => {
        const route = stats.lwr || stats.nlwr;
        if (route) {
          const hops = [
            ...route.repeaters.map((id, i) => [
              Object.keys(this._devices).find(
                (_nodeId) => this._devices[_nodeId]?.id === id
              )?.[0],
              route.repeater_rssi[i],
            ]),
            [controllerNode!, route.rssi],
          ];
          let sourceNode: string = nodeId;
          hops.forEach(([repeater, rssi]) => {
            const RSSI = typeof rssi === "number" && rssi <= 0 ? rssi : -100;
            const existingLink = links.find(
              (link) =>
                link.source === sourceNode && link.target === String(repeater)
            );
            const width = this._getLineWidth(RSSI);
            if (existingLink) {
              existingLink.value = Math.max(existingLink.value!, RSSI);
              existingLink.lineStyle = {
                ...existingLink.lineStyle,
                width: Math.max(existingLink.lineStyle!.width!, width),
                type:
                  route.protocol_data_rate > 1
                    ? "solid"
                    : existingLink.lineStyle!.type,
              };
            } else {
              links.push({
                source: sourceNode,
                target: String(repeater),
                value: RSSI,
                lineStyle: {
                  width,
                  color:
                    repeater === controllerNode
                      ? colorVariables["primary-color"]
                      : colorVariables["disabled-color"],
                  type: route.protocol_data_rate > 1 ? "solid" : "dotted",
                },
                symbolSize: width * 3,
              });
            }
            sourceNode = String(repeater);
          });
        }
      });

      return { nodes, links, categories };
    }
  );

  private _handleUpdatedNodeStatistics = debounce(() => {
    // all the node events come in at once, so we need to debounce to avoid
    // unnecessary re-renders
    this._nodeStatistics = { ...this._nodeStatistics };
  }, 500);

  private _handleChartClick(e: CustomEvent) {
    if (
      e.detail.dataType === "node" &&
      e.detail.event.target.cursor === "pointer"
    ) {
      const { id } = e.detail.data;
      const device = this._devices[id];
      if (device) {
        navigate(`/config/devices/device/${device.id}`);
      }
    }
  }

  private _getLineWidth(rssi: number): number {
    return rssi > -50 ? 3 : rssi > -75 ? 2 : 1;
  }

  static get styles() {
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
    "zwave_js-network-visualization": ZWaveJSNetworkVisualization;
  }
}
