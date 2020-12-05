import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
} from "lit-element";

import { navigate } from "../../../../../common/navigate";
import { fetchDevices, ZHADevice } from "../../../../../data/zha";
import "../../../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../../../types";
import { Network, Edge, Node, EdgeOptions } from "vis-network";
import "../../../../../common/search/search-input";
import "../../../../../components/ha-button-menu";
import "../../../../../components/ha-svg-icon";
import { formatAsPaddedHex } from "./functions";

@customElement("zha-network-visualization-page")
export class ZHANetworkVisualizationPage extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @query("#visualization", true)
  private _visualization?: HTMLElement;

  @internalProperty()
  private _devices: Map<string, ZHADevice> = new Map();

  @internalProperty()
  private _nodes: Node[] = [];

  @internalProperty()
  private _network?: Network;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchData();
    }
    this._network = new Network(
      this._visualization!,
      {},
      {
        autoResize: true,
        height: window.innerHeight + "px",
        width: window.innerWidth + "px",
        layout: {
          improvedLayout: true,
        },
        physics: {
          barnesHut: {
            springConstant: 0,
            avoidOverlap: 10,
            damping: 0.09,
          },
        },
        nodes: {
          font: {
            multi: "html",
          },
        },
        edges: {
          smooth: {
            enabled: true,
            type: "continuous",
            forceDirection: "none",
            roundness: 0.6,
          },
        },
      }
    );
    this._network.on("doubleClick", (properties) => {
      const ieee = properties.nodes[0];
      if (ieee) {
        const device = this._devices.get(ieee);
        if (device) {
          navigate(
            this,
            `/config/devices/device/${device.device_reg_id}`,
            false
          );
        }
      }
    });
  }

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .header=${this.hass.localize(
          "ui.panel.config.zha.visualization.header"
        )}
      >
        <div class="table-header">
          <search-input
            no-label-float
            no-underline
            @value-changed=${this._handleSearchChange}
            .label=${this.hass.localize("ui.components.data-table.search")}
          >
          </search-input>
        </div>
        <div id="visualization"></div>
      </hass-subpage>
    `;
  }

  private async _fetchData() {
    const devices = await fetchDevices(this.hass!);
    this._devices = new Map(
      devices.map((device: ZHADevice) => [device.ieee, device])
    );
    this._updateDevices(devices);
  }

  private _updateDevices(devices: ZHADevice[]) {
    this._nodes = [];
    const edges: Edge[] = [];

    devices.forEach((device) => {
      this._nodes.push({
        id: device.ieee,
        label: this._buildLabel(device),
        shape: this._getShape(device),
        mass: this._getMass(device),
      });
      if (device.neighbors && device.neighbors.length > 0) {
        device.neighbors.forEach((neighbor) => {
          const idx = edges.findIndex(function (e) {
            return device.ieee === e.to && neighbor.ieee === e.from;
          });
          if (idx === -1) {
            edges.push({
              from: device.ieee,
              to: neighbor.ieee,
              label: neighbor.lqi + "",
              color: this._getLQI(neighbor.lqi),
            });
          } else {
            edges[idx].color = this._getLQI(
              (parseInt(edges[idx].label!) + neighbor.lqi) / 2
            );
            edges[idx].label += "/" + neighbor.lqi;
          }
        });
      }
    });

    this._network?.setData({ nodes: this._nodes, edges: edges });
  }

  private _getLQI(lqi: number): EdgeOptions["color"] {
    if (lqi > 192) {
      return { color: "#17ab00", highlight: "#17ab00" };
    }
    if (lqi > 128) {
      return { color: "#e6b402", highlight: "#e6b402" };
    }
    if (lqi > 80) {
      return { color: "#fc4c4c", highlight: "#fc4c4c" };
    }
    return { color: "#bfbfbf", highlight: "#bfbfbf" };
  }

  private _getMass(device: ZHADevice): number {
    if (device.device_type === "Coordinator") {
      return 2;
    }
    if (device.device_type === "Router") {
      return 4;
    }
    return 5;
  }

  private _getShape(device: ZHADevice): string {
    if (device.device_type === "Coordinator") {
      return "box";
    }
    if (device.device_type === "Router") {
      return "ellipse";
    }
    return "circle";
  }

  private _buildLabel(device: ZHADevice): string {
    let label =
      device.user_given_name !== null
        ? `<b>${device.user_given_name}</b>\n`
        : "";
    label += `<b>IEEE: </b>${device.ieee}`;
    label += `\n<b>Device Type: </b>${device.device_type.replace("_", " ")}`;
    if (device.nwk != null) {
      label += `\n<b>NWK: </b>${formatAsPaddedHex(device.nwk)}`;
    }
    if (device.manufacturer != null && device.model != null) {
      label += `\n<b>Device: </b>${device.manufacturer} ${device.model}`;
    } else {
      label += "\n<b>Device is not in <i>'zigbee.db'</i></b>";
    }
    if (!device.available) {
      label += "\n<b>Device is <i>Offline</i></b>";
    }
    return label;
  }

  private _handleSearchChange(ev: CustomEvent) {
    const filter: string = ev.detail.value;
    if (filter && filter !== "" && this._network) {
      const filterParts: string[] = filter.split(":");
      if (filterParts.length === 2) {
        const filteredNodeIds: (string | number)[] = this._nodes
          .filter(
            (node: Node) =>
              node.label &&
              node.label.toLowerCase().includes(filterParts[1].toLowerCase())
          )
          .map((node: Node) => node.id);

        if (filterParts[0] === "filter") {
          this._network.selectNodes(filteredNodeIds, true);
        }
        if (filterParts[0] === "zoom") {
          this._network.fit({ nodes: filteredNodeIds });
        }
      }
    }
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .header {
          font-family: var(--paper-font-display1_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-display1_-_-webkit-font-smoothing
          );
          font-size: var(--paper-font-display1_-_font-size);
          font-weight: var(--paper-font-display1_-_font-weight);
          letter-spacing: var(--paper-font-display1_-_letter-spacing);
          line-height: var(--paper-font-display1_-_line-height);
          opacity: var(--dark-primary-opacity);
        }
        .table-header {
          border-bottom: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
          padding: 0 16px;
          display: flex;
          align-items: center;
          height: var(--header-height);
        }
        .search-toolbar {
          display: flex;
          align-items: center;
          color: var(--secondary-text-color);
          padding: 0 16px;
        }
        search-input {
          position: relative;
          top: 2px;
          flex-grow: 1;
        }
        search-input.header {
          left: -8px;
        }
        .active-filters {
          color: var(--primary-text-color);
          position: relative;
          display: flex;
          align-items: center;
          padding: 2px 2px 2px 8px;
          margin-left: 4px;
          font-size: 14px;
        }
        .active-filters ha-icon {
          color: var(--primary-color);
        }
        .active-filters mwc-button {
          margin-left: 8px;
        }
        .active-filters::before {
          background-color: var(--primary-color);
          opacity: 0.12;
          border-radius: 4px;
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          content: "";
        }
        .search-toolbar .active-filters {
          top: -8px;
          right: -16px;
        }
      `,
    ];
  }
}
