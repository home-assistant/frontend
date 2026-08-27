import { mdiSpiderWeb } from "@mdi/js";
import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { getDeviceArea } from "../../../../../common/entity/context/get_device_context";
import { navigate } from "../../../../../common/navigate";
import { debounce } from "../../../../../common/util/debounce";
import "../../../../../components/chart/ha-network-graph";
import "../../../../../components/chart/ha-chart-tooltip-marker";
import type {
  NetworkData,
  NetworkLink,
  NetworkNode,
} from "../../../../../components/chart/ha-network-graph";
import "../../../../../components/ha-icon-button";
import "../../../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../../../components/input/ha-input-search";
import type { DeviceRegistryEntry } from "../../../../../data/device/device_registry";
import type {
  RssiError,
  ZWaveJSNodeStatisticsUpdatedMessage,
  ZWaveJSNodeStatus,
} from "../../../../../data/zwave_js";
import {
  fetchZwaveNetworkNeighbors,
  fetchZwaveNetworkStatus,
  getNodeIdFromDevice,
  NodeStatus,
  subscribeZwaveNodeStatistics,
} from "../../../../../data/zwave_js";
import "../../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import type { HomeAssistant, Route } from "../../../../../types";
import { showToast } from "../../../../../util/toast";

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

  @state() private _neighbors?: Record<number, number[]>;

  @state() private _showNeighbors = false;

  @state() private _searchFilter = "";

  // Route statistics reference repeaters by device registry ID
  private _nodeIdsByDeviceId: Record<string, number> = {};

  private _neighborLinks = new Set<string>();

  private _loadingNeighbors = false;

  public hassSubscribe() {
    const subscriptions: Promise<UnsubscribeFunc>[] = [];
    const devices: Record<number, DeviceRegistryEntry> = {};
    const nodeIdsByDeviceId: Record<string, number> = {};

    Object.values(this.hass.devices).forEach((device) => {
      if (!device.config_entries.includes(this.configEntryId)) {
        return;
      }
      const nodeId = getNodeIdFromDevice(device);
      if (nodeId === undefined) {
        return;
      }
      devices[nodeId] = device;
      nodeIdsByDeviceId[device.id] = nodeId;
      subscriptions.push(
        subscribeZwaveNodeStatistics(this.hass!, device.id, (message) => {
          this._nodeStatistics[nodeId] = message;
          this._handleUpdatedNodeStatistics();
        })
      );
    });

    this._nodeIdsByDeviceId = nodeIdsByDeviceId;
    this._devices = devices;

    return subscriptions;
  }

  private async _toggleNeighbors() {
    this._showNeighbors = !this._showNeighbors;
    if (!this._showNeighbors || this._neighbors || this._loadingNeighbors) {
      return;
    }
    // fetched on demand: reading neighbors turns the radio off briefly
    this._loadingNeighbors = true;
    try {
      this._neighbors = await fetchZwaveNetworkNeighbors(
        this.hass,
        this.configEntryId
      );
    } catch (err: unknown) {
      this._showNeighbors = false;
      showToast(this, {
        message:
          (err as { message?: string }).message ??
          this.hass.localize(
            "ui.panel.config.zwave_js.visualization.neighbors_error"
          ),
      });
    } finally {
      this._loadingNeighbors = false;
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    this._fetchNetworkStatus();
  }

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.zwave_js.navigation.visualization"
        )}
        back-path="/config/zwave_js/dashboard?config_entry=${
          this.configEntryId
        }"
      >
        ${
          this.narrow
            ? html`<div slot="header">${this._renderInputSearch()}</div>`
            : nothing
        }
        <ha-network-graph
          .hass=${this.hass}
          .searchFilter=${this._searchFilter}
          .data=${this._getNetworkData(
            this._nodeStatuses,
            this._nodeStatistics,
            this._showNeighbors ? this._neighbors : undefined
          )}
          .searchableAttributes=${this._getSearchableAttributes}
          .tooltipFormatter=${this._tooltipFormatter}
          @chart-click=${this._handleChartClick}
        >
          ${!this.narrow ? this._renderInputSearch("search") : nothing}
          <ha-icon-button
            slot="button"
            class=${this._showNeighbors ? "active" : "inactive"}
            .path=${mdiSpiderWeb}
            .label=${this.hass.localize(
              "ui.panel.config.zwave_js.visualization.toggle_neighbors"
            )}
            @click=${this._toggleNeighbors}
          ></ha-icon-button>
        </ha-network-graph>
      </hass-subpage>
    `;
  }

  private _renderInputSearch(slot = "") {
    return html`<ha-input-search
      appearance="outlined"
      slot=${slot}
      .value=${this._searchFilter}
      @input=${this._handleSearchChange}
    ></ha-input-search>`;
  }

  private async _fetchNetworkStatus() {
    const network = await fetchZwaveNetworkStatus(this.hass!.connection, {
      entry_id: this.configEntryId,
    });
    const nodeStatuses: Record<number, ZWaveJSNodeStatus> = {};
    network.controller.nodes.forEach((node) => {
      nodeStatuses[node.node_id] = node;
    });

    this._nodeStatuses = nodeStatuses;
  }

  private _getSearchableAttributes = (nodeId: string): string[] => {
    const device = this._devices[Number(nodeId)];
    const nodeStatus = this._nodeStatuses[Number(nodeId)];
    const attributes: string[] = [];
    if (device?.manufacturer) {
      attributes.push(device.manufacturer);
    }
    if (device?.model) {
      attributes.push(device.model);
    }
    if (nodeStatus) {
      const statusText = this.hass.localize(
        `ui.panel.config.zwave_js.node_status.${nodeStatus.status}` as any
      );
      if (statusText) {
        attributes.push(statusText);
      }
    }
    return attributes;
  };

  private _handleSearchChange(ev: InputEvent): void {
    this._searchFilter = (ev.target as HaInputSearch).value ?? "";
  }

  private _tooltipFormatter = (params: TopLevelFormatterParams) => {
    const { dataType, data } = params as CallbackDataParams;
    if (dataType === "edge") {
      const { source, target, value } = data as any;
      const sourceDevice = this._devices[source];
      const targetDevice = this._devices[target];
      const sourceName =
        sourceDevice?.name_by_user ?? sourceDevice?.name ?? source;
      const targetName =
        targetDevice?.name_by_user ?? targetDevice?.name ?? target;
      if (this._neighborLinks.has(`${source}>${target}`)) {
        return html`${sourceName} ↔ ${targetName}<br /><b
            >${this.hass.localize(
              "ui.panel.config.zwave_js.visualization.neighbor"
            )}</b
          >`;
      }
      // links point away from the controller, so the route belongs to the target
      const stats =
        this._nodeStatistics[target] ?? this._nodeStatistics[source];
      const route = stats?.lwr || stats?.nlwr;
      return html`${sourceName} →
      ${targetName}${
        route?.protocol_data_rate
          ? html`<br /><b
                >${this.hass.localize(
                  "ui.panel.config.zwave_js.visualization.data_rate"
                )}:</b
              >
              ${this.hass.localize(
                `ui.panel.config.zwave_js.protocol_data_rate.${route.protocol_data_rate}` as any
              )}`
          : nothing
      }${value ? html`<br /><b>RSSI:</b> ${value}` : nothing}`;
    }
    const { id, name } = data as any;
    const device = this._devices[id] as DeviceRegistryEntry | undefined;
    const nodeStatus = this._nodeStatuses[id];
    const area = device
      ? getDeviceArea(device, this.hass.areas, this.hass.devices)
      : undefined;
    return html`<ha-chart-tooltip-marker
        .color=${String((params as CallbackDataParams).color ?? "")}
      ></ha-chart-tooltip-marker>
      ${name}<br /><b
        >${this.hass.localize(
          "ui.panel.config.zwave_js.visualization.node_id"
        )}:</b
      >
      ${id}${
        device
          ? html`<br /><b
                >${this.hass.localize(
                  "ui.panel.config.zwave_js.visualization.manufacturer"
                )}:</b
              >
              ${device.manufacturer || "-"}<br /><b
                >${this.hass.localize(
                  "ui.panel.config.zwave_js.visualization.model"
                )}:</b
              >
              ${device.model || "-"}`
          : nothing
      }${
        nodeStatus
          ? html`<br /><b
                >${this.hass.localize(
                  "ui.panel.config.zwave_js.visualization.status"
                )}:</b
              >
              ${this.hass.localize(
                `ui.panel.config.zwave_js.node_status.${nodeStatus.status}` as any
              )}${
                nodeStatus.zwave_plus_version
                  ? html`<br /><b>Z-Wave Plus:</b> ${this.hass.localize(
                        "ui.panel.config.zwave_js.visualization.version"
                      )}
                      ${nodeStatus.zwave_plus_version}`
                  : nothing
              }`
          : nothing
      }${
        area
          ? html`<br /><b
                >${this.hass.localize(
                  "ui.panel.config.zwave_js.visualization.area"
                )}:</b
              >
              ${area.name}`
          : nothing
      }`;
  };

  private _getNetworkData = memoizeOne(
    (
      nodeStatuses: Record<number, ZWaveJSNodeStatus>,
      nodeStatistics: Record<number, ZWaveJSNodeStatisticsUpdatedMessage>,
      neighbors: Record<number, number[]> | undefined
    ): NetworkData => {
      const style = getComputedStyle(this);
      const nodes: NetworkNode[] = [];
      const links: NetworkLink[] = [];

      const categories = [
        {
          name: this.hass.localize(
            "ui.panel.config.zwave_js.visualization.controller"
          ),
          symbol: "roundRect",
          itemStyle: {
            color: style.getPropertyValue("--primary-color"),
          },
        },
        {
          name: this.hass.localize(
            "ui.panel.config.zwave_js.visualization.node"
          ),
          symbol: "circle",
          itemStyle: {
            color: style.getPropertyValue("--cyan-color"),
          },
        },
        {
          name: this.hass.localize(
            "ui.panel.config.zwave_js.visualization.asleep_node"
          ),
          symbol: "circle",
          itemStyle: {
            color: style.getPropertyValue("--disabled-color"),
          },
        },
        {
          name: this.hass.localize(
            "ui.panel.config.zwave_js.visualization.dead_node"
          ),
          symbol: "circle",
          itemStyle: {
            color: style.getPropertyValue("--error-color"),
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
        const device = this._devices[node.node_id] as
          DeviceRegistryEntry | undefined;
        const area = device
          ? getDeviceArea(device, this.hass.areas, this.hass.devices)
          : undefined;
        nodes.push({
          id: String(node.node_id),
          name: device?.name_by_user ?? device?.name ?? String(node.node_id),
          context: area?.name,
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
                ? style.getPropertyValue("--error-color")
                : node.status === NodeStatus.Asleep
                  ? style.getPropertyValue("--disabled-color")
                  : node.is_controller_node
                    ? style.getPropertyValue("--primary-color")
                    : style.getPropertyValue("--cyan-color"),
          },
          polarDistance: node.is_controller_node
            ? 0
            : node.status === NodeStatus.Dead
              ? 0.9
              : 0.5,
          fixed: node.is_controller_node,
        });
      });

      if (controllerNode === undefined) {
        return { nodes, links, categories };
      }
      const controllerId = String(controllerNode);

      Object.entries(nodeStatistics).forEach(([nodeId, stats]) => {
        const route = stats.lwr || stats.nlwr;
        if (!route) {
          return;
        }
        // Routes go from the controller to the node via the repeaters, in order.
        // Each station measures the hop leaving it: the controller reports
        // `rssi`, repeater i reports `repeater_rssi[i]`.
        const hops: [string, RssiError | number | null][] = [];
        let hopRssi = route.rssi;
        route.repeaters.forEach((deviceId, i) => {
          const repeaterNodeId = this._nodeIdsByDeviceId[deviceId];
          // skip repeaters we can't resolve, so the chain stays connected
          if (repeaterNodeId !== undefined) {
            hops.push([String(repeaterNodeId), hopRssi]);
          }
          hopRssi = route.repeater_rssi[i];
        });
        hops.push([nodeId, hopRssi]);

        let sourceNode = controllerId;
        hops.forEach(([target, rssi]) => {
          if (target === sourceNode) {
            return;
          }
          const RSSI = typeof rssi === "number" && rssi <= 0 ? rssi : -100;
          const existingLink = links.find(
            (link) => link.source === sourceNode && link.target === target
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
              target,
              value: RSSI,
              lineStyle: {
                width,
                color:
                  sourceNode === controllerId
                    ? style.getPropertyValue("--primary-color")
                    : style.getPropertyValue("--disabled-color"),
                type: route.protocol_data_rate > 1 ? "solid" : "dotted",
              },
              symbolSize: width * 3,
            });
          }
          sourceNode = target;
        });
      });

      // Neighbors are the nodes a node can reach directly. They are symmetric
      // and carry no signal information, so they fill in the mesh underneath
      // the measured routes without overriding them.
      const neighborLinks: NetworkLink[] = [];
      const neighborKeys = new Set<string>();
      Object.entries(neighbors ?? {}).forEach(([nodeId, neighborIds]) => {
        neighborIds.forEach((neighborId) => {
          const target = String(neighborId);
          if (!nodeStatuses[neighborId] || target === nodeId) {
            return;
          }
          const [a, b] = [nodeId, target].sort();
          const key = `${a}>${b}`;
          if (
            neighborKeys.has(key) ||
            links.some(
              (link) =>
                (link.source === nodeId && link.target === target) ||
                (link.source === target && link.target === nodeId)
            )
          ) {
            return;
          }
          neighborKeys.add(key);
          neighborLinks.push({
            source: a,
            target: b,
            // equal values in both directions render the link without an arrow
            value: 1,
            reverseValue: 1,
            lineStyle: {
              width: 1,
              color: style.getPropertyValue("--disabled-color"),
              type: "dashed",
            },
            // neighbors are plentiful, let the routes shape the layout
            ignoreForceLayout: true,
          });
        });
      });
      this._neighborLinks = neighborKeys;

      return { nodes, links: [...neighborLinks, ...links], categories };
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
        [slot="header"] {
          display: flex;
          align-items: center;
        }
        ha-input-search {
          flex: 1;
        }
        /* ha-chart-base can't style re-slotted buttons, so mirror its look */
        ha-icon-button[slot="button"] {
          background: var(--card-background-color);
          border-radius: var(--ha-border-radius-sm);
          --ha-icon-button-size: 32px;
          color: var(--primary-color);
          border: 1px solid var(--divider-color);
        }
        ha-icon-button[slot="button"].inactive {
          color: var(--state-inactive-color);
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
