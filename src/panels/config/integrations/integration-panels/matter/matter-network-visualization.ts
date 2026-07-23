import { mdiRefresh } from "@mdi/js";
import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../../../../common/datetime/relative_time";
import { getDeviceArea } from "../../../../../common/entity/context/get_device_context";
import { navigate } from "../../../../../common/navigate";
import type { LocalizeKeys } from "../../../../../common/translations/localize";
import { throttle } from "../../../../../common/util/throttle";
import "../../../../../components/chart/ha-network-graph";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-spinner";
import "../../../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../../../components/input/ha-input-search";
import type {
  MatterNetworkTopology,
  MatterNetworkTopologyConnection,
  MatterNetworkTopologyNode,
  MatterTopologyDirectionInfo,
} from "../../../../../data/matter";
import {
  fetchMatterNetworkTopology,
  subscribeMatterNetworkTopology,
} from "../../../../../data/matter";
import "../../../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../../../types";
import { createMatterNetworkChartData } from "./matter-network-data";

const UPDATE_THROTTLE_TIME = 5000;

@customElement("matter-network-visualization")
export class MatterNetworkVisualization extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _topology?: MatterNetworkTopology;

  @state() private _notSupported = false;

  @state() private _error?: string;

  @state() private _refreshing = false;

  @state() private _searchFilter = "";

  private _unsub?: Promise<UnsubscribeFunc>;

  private _throttledUpdateTopology = throttle(
    (topology: MatterNetworkTopology) => {
      this._topology = topology;
    },
    UPDATE_THROTTLE_TIME
  );

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && !this._unsub) {
      this._subscribe();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._throttledUpdateTopology.cancel();
    if (this._unsub) {
      this._unsub.then((unsub) => unsub()).catch(() => undefined);
      this._unsub = undefined;
    }
  }

  private _subscribe(): void {
    this._unsub = subscribeMatterNetworkTopology(this.hass, (topology) => {
      if (!this._topology) {
        this._topology = topology;
      } else {
        this._throttledUpdateTopology(topology);
      }
    });
    this._unsub.catch((err: { code?: string; message?: string }) => {
      this._unsub = undefined;
      if (err?.code === "not_supported" || err?.code === "unknown_command") {
        this._notSupported = true;
      } else {
        this._error = err?.message || String(err);
      }
    });
  }

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.matter.visualization.header"
        )}
        back-path="/config/matter/dashboard"
      >
        ${
          this.narrow && this._topology?.nodes.length
            ? html`<div slot="header">${this._renderInputSearch()}</div>`
            : nothing
        }
        ${this._renderContent()}
      </hass-subpage>
    `;
  }

  private _renderContent() {
    if (this._notSupported) {
      return html`<div class="center">
        <ha-alert alert-type="info">
          ${this.hass.localize(
            "ui.panel.config.matter.visualization.not_supported"
          )}
        </ha-alert>
      </div>`;
    }
    if (this._error) {
      return html`<div class="center">
        <ha-alert alert-type="error">
          ${this.hass.localize(
            "ui.panel.config.matter.visualization.error_loading",
            { error: this._error }
          )}
        </ha-alert>
      </div>`;
    }
    if (!this._topology) {
      return html`<div class="center"><ha-spinner></ha-spinner></div>`;
    }
    if (!this._topology.nodes.length) {
      return html`<div class="center empty">
        ${this.hass.localize("ui.panel.config.matter.visualization.empty")}
      </div>`;
    }
    return html`
      <ha-network-graph
        .hass=${this.hass}
        .searchFilter=${this._searchFilter}
        .data=${this._formatNetworkData(
          this._topology,
          this.hass.devices,
          this.hass.areas
        )}
        .searchableAttributes=${this._getSearchableAttributes}
        .tooltipFormatter=${this._tooltipFormatter}
        @chart-click=${this._handleChartClick}
      >
        ${!this.narrow ? this._renderInputSearch("search") : nothing}
        <ha-icon-button
          slot="button"
          class="refresh-button"
          .disabled=${this._refreshing}
          .path=${mdiRefresh}
          @click=${this._refreshTopology}
          label=${this.hass.localize(
            "ui.panel.config.matter.visualization.refresh_topology"
          )}
        ></ha-icon-button>
      </ha-network-graph>
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

  private _handleSearchChange(ev: InputEvent): void {
    this._searchFilter = (ev.target as HaInputSearch).value ?? "";
  }

  private async _refreshTopology(): Promise<void> {
    if (this._refreshing) {
      return;
    }
    this._refreshing = true;
    try {
      this._topology = await fetchMatterNetworkTopology(this.hass, true);
    } catch (err: unknown) {
      this._error = (err as { message?: string })?.message || String(err);
    } finally {
      this._refreshing = false;
    }
  }

  private _formatNetworkData = memoizeOne(
    (
      topology: MatterNetworkTopology,
      _devices: HomeAssistant["devices"],
      _areas: HomeAssistant["areas"]
    ) => createMatterNetworkChartData(topology, this.hass, this)
  );

  private _getTopologyNode(id: string): MatterNetworkTopologyNode | undefined {
    return this._topology?.nodes.find((node) => node.id === id);
  }

  private _getConnection(
    source: string,
    target: string
  ): MatterNetworkTopologyConnection | undefined {
    return this._topology?.connections.find(
      (conn) =>
        (conn.source === source && conn.target === target) ||
        (conn.source === target && conn.target === source)
    );
  }

  private _getNodeName(id: string): string {
    const node = this._getTopologyNode(id);
    if (!node) {
      return id;
    }
    const device = node.ha_device_id
      ? this.hass.devices[node.ha_device_id]
      : undefined;
    if (device) {
      return device.name_by_user || device.name || id;
    }
    if (node.kind === "border_router") {
      return (
        [node.vendor_name, node.model_name].filter(Boolean).join(" ") ||
        this.hass.localize("ui.panel.config.matter.visualization.border_router")
      );
    }
    if (node.kind === "wifi_ap") {
      return (
        node.network_name ||
        this.hass.localize("ui.panel.config.matter.visualization.wifi_ap")
      );
    }
    if (node.kind === "thread_unknown") {
      return this.hass.localize(
        "ui.panel.config.matter.visualization.unknown_device"
      );
    }
    if (node.node_id != null) {
      return this.hass.localize("ui.panel.config.matter.visualization.node", {
        node_id: node.node_id,
      });
    }
    return id;
  }

  private _getSearchableAttributes = (nodeId: string): string[] => {
    const node = this._getTopologyNode(nodeId);
    if (!node) {
      return [];
    }
    const attributes: string[] = [];
    if (node.node_id != null) {
      attributes.push(String(node.node_id));
    }
    if (node.network_name) {
      attributes.push(node.network_name);
    }
    if (node.ext_address) {
      attributes.push(node.ext_address);
    }
    if (node.vendor_name) {
      attributes.push(node.vendor_name);
    }
    if (node.model_name) {
      attributes.push(node.model_name);
    }
    const device = node.ha_device_id
      ? this.hass.devices[node.ha_device_id]
      : undefined;
    if (device?.manufacturer) {
      attributes.push(device.manufacturer);
    }
    if (device?.model) {
      attributes.push(device.model);
    }
    device?.connections.forEach((connection) => {
      attributes.push(connection[1]);
    });
    return attributes;
  };

  private _localizeDynamic(prefix: string, value: string): string {
    return (
      this.hass.localize(
        `ui.panel.config.matter.${prefix}.${value}` as LocalizeKeys
      ) || value
    );
  }

  private _formatDirection(direction: MatterTopologyDirectionInfo): string {
    const strength = this._localizeDynamic(
      "visualization.strength",
      direction.strength
    );
    if (direction.lqi != null) {
      return `${strength} (LQI ${direction.lqi})`;
    }
    if (direction.rssi != null) {
      return `${strength} (RSSI ${direction.rssi} dBm)`;
    }
    return strength;
  }

  private _tooltipFormatter = (params: TopLevelFormatterParams) => {
    const { dataType, data } = params as CallbackDataParams;
    if (dataType === "edge") {
      const { source, target } = data as { source: string; target: string };
      const conn = this._getConnection(source, target);
      if (!conn) {
        return nothing;
      }
      const lines: TemplateResult[] = [];
      if (conn.source_to_target) {
        lines.push(
          html`<br />${this._getNodeName(conn.source)} →
            ${this._getNodeName(conn.target)}:
            ${this._formatDirection(conn.source_to_target)}`
        );
      }
      if (conn.target_to_source) {
        lines.push(
          html`<br />${this._getNodeName(conn.target)} →
            ${this._getNodeName(conn.source)}:
            ${this._formatDirection(conn.target_to_source)}`
        );
      }
      if (!lines.length && conn.via_route_table) {
        lines.push(
          html`<br />${this.hass.localize(
              "ui.panel.config.matter.visualization.via_route_table"
            )}`
        );
      }
      return html`<b
          >${this._getNodeName(conn.source)} ↔
          ${this._getNodeName(conn.target)}</b
        >${lines}`;
    }
    const { id } = data as { id: string };
    const node = this._getTopologyNode(id);
    if (!node) {
      return nothing;
    }
    const device = node.ha_device_id
      ? this.hass.devices[node.ha_device_id]
      : undefined;
    const area = device ? getDeviceArea(device, this.hass.areas) : undefined;
    const lines: TemplateResult[] = [];
    if (node.node_id != null) {
      lines.push(
        html`<br /><b
            >${this.hass.localize(
              "ui.panel.config.matter.visualization.node_id"
            )}:</b
          >
          ${node.node_id}`
      );
    }
    lines.push(
      html`<br /><b
          >${this.hass.localize(
            "ui.panel.config.matter.visualization.network"
          )}:</b
        >
        ${this._localizeDynamic("network_type", node.network_type)}${
          node.network_name ? html` (${node.network_name})` : nothing
        }`
    );
    if (node.role) {
      lines.push(
        html`<br /><b
            >${this.hass.localize(
              "ui.panel.config.matter.visualization.role"
            )}:</b
          >
          ${this._localizeDynamic("visualization.roles", node.role)}`
      );
    }
    if (node.available != null) {
      lines.push(
        html`<br /><b
            >${this.hass.localize(
              "ui.panel.config.matter.visualization.status"
            )}:</b
          >
          ${this.hass.localize(
            node.available
              ? "ui.panel.config.matter.visualization.online"
              : "ui.panel.config.matter.visualization.offline"
          )}`
      );
    }
    if (device?.manufacturer || node.vendor_name) {
      lines.push(
        html`<br /><b
            >${this.hass.localize(
              "ui.panel.config.matter.visualization.manufacturer"
            )}:</b
          >
          ${device?.manufacturer || node.vendor_name}`
      );
    }
    if (device?.model || node.model_name) {
      lines.push(
        html`<br /><b
            >${this.hass.localize(
              "ui.panel.config.matter.visualization.model"
            )}:</b
          >
          ${device?.model || node.model_name}`
      );
    }
    if (area) {
      lines.push(
        html`<br /><b
            >${this.hass.localize(
              "ui.panel.config.matter.visualization.area"
            )}:</b
          >
          ${area.name}`
      );
    }
    if (node.last_seen != null) {
      lines.push(
        html`<br /><b
            >${this.hass.localize(
              "ui.panel.config.matter.visualization.last_seen"
            )}:</b
          >
          ${relativeTime(new Date(node.last_seen), this.hass.locale)}`
      );
    }
    return html`<b>${this._getNodeName(id)}</b>${lines}`;
  };

  private _handleChartClick(e: CustomEvent): void {
    if (
      e.detail.dataType === "node" &&
      e.detail.event.target.cursor === "pointer"
    ) {
      const { id } = e.detail.data;
      const node = this._getTopologyNode(id);
      if (node?.ha_device_id) {
        navigate(`/config/devices/device/${node.ha_device_id}`);
      }
    }
  }

  static get styles(): CSSResultGroup {
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
        .center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: var(--ha-space-4);
          box-sizing: border-box;
        }
        ha-alert {
          max-width: 500px;
        }
        .empty {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-network-visualization": MatterNetworkVisualization;
  }
}
