import { customElement, property, state } from "lit/decorators";
import { css, html, LitElement } from "lit";
import memoizeOne from "memoize-one";
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

    // const neighbors = await fetchZwaveNeighbors(this.hass!, this.configEntryId);
    // console.log("neighbors", neighbors);
  }

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
          fixed: node.is_controller_node,
          polarDistance: node.is_controller_node
            ? 0
            : node.status === NodeStatus.Dead
              ? 1
              : 0.5,
          category:
            node.status === NodeStatus.Dead
              ? 3
              : node.status === NodeStatus.Asleep
                ? 2
                : node.is_controller_node
                  ? 0
                  : 1,
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
        });
      });

      Object.entries(nodeStatistics).forEach(([nodeId, stats]) => {
        const route = stats.lwr || stats.nlwr;
        if (route) {
          const hops = [
            ...route.repeaters
              .map(
                (id) =>
                  Object.entries(this._devices).find(
                    ([_nodeId, d]) => d.id === id
                  )?.[0]
              )
              .filter(Boolean),
            controllerNode!,
          ];
          let sourceNode = nodeId;
          hops.forEach((repeater) => {
            links.push({
              source: String(sourceNode),
              target: String(repeater),
            });
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

  private _handleChartClick(_e: CustomEvent) {
    // @TODO
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
