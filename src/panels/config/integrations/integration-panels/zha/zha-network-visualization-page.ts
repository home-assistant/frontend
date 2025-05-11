import "@material/mwc-button";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/chart/ha-network-graph";
import type {
  NetworkData,
  NetworkNode,
  NetworkLink,
} from "../../../../../components/chart/ha-network-graph";
import type { ZHADevice } from "../../../../../data/zha";
import { fetchDevices, refreshTopology } from "../../../../../data/zha";
import "../../../../../layouts/hass-tabs-subpage";
import type { HomeAssistant, Route } from "../../../../../types";
import { formatAsPaddedHex } from "./functions";
import { zhaTabs } from "./zha-config-dashboard";

@customElement("zha-network-visualization-page")
export class ZHANetworkVisualizationPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state()
  private _networkData?: NetworkData;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);

    if (this.hass) {
      this._fetchData();
    }
  }

  protected render() {
    return html`
      <hass-tabs-subpage
        .tabs=${zhaTabs}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        .route=${this.route}
        .header=${this.hass.localize(
          "ui.panel.config.zha.visualization.header"
        )}
      >
        <div class="header">
          <mwc-button @click=${this._refreshTopology}>
            ${this.hass!.localize(
              "ui.panel.config.zha.visualization.refresh_topology"
            )}
          </mwc-button>
        </div>

        <ha-network-graph
          .hass=${this.hass}
          .data=${this._networkData}
          height="calc(100vh - 112px)"
        ></ha-network-graph>
      </hass-tabs-subpage>
    `;
  }

  private async _fetchData() {
    const devices = await fetchDevices(this.hass!);
    this._networkData = this._createChartData(devices);
  }

  private _buildLabel(device: ZHADevice): string {
    let label = `<b>IEEE: </b>${device.ieee}`;
    label += `<br><b>Device Type: </b>${device.device_type.replace("_", " ")}`;
    if (device.nwk != null) {
      label += `<br><b>NWK: </b>${formatAsPaddedHex(device.nwk)}`;
    }
    if (device.manufacturer != null && device.model != null) {
      label += `<br><b>Device: </b>${device.manufacturer} ${device.model}`;
    } else {
      label += "<br><b>Device is not in <i>'zigbee.db'</i></b>";
    }
    if (device.area_id) {
      const area = this.hass.areas[device.area_id];
      if (area) {
        label += `<br><b>Area: </b>${area.name}`;
      }
    }
    return label;
  }

  private async _refreshTopology(): Promise<void> {
    await refreshTopology(this.hass);
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .header {
          border-bottom: 1px solid var(--divider-color);
          padding: 0 8px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          height: var(--header-height);
          box-sizing: border-box;
        }

        .header > * {
          padding: 0 8px;
        }
      `,
    ];
  }

  private _createChartData(devices: ZHADevice[]): NetworkData {
    const nodes: NetworkNode[] = [];
    const links: NetworkLink[] = [];
    const categories = [
      {
        name: "Coordinator",
        icon: "roundRect",
        itemStyle: { color: "#4CAF50" },
      },
      { name: "Router", icon: "circle", itemStyle: { color: "#2196F3" } },
      { name: "End Device", icon: "circle", itemStyle: { color: "#9E9E9E" } },
      { name: "Offline", icon: "circle", itemStyle: { color: "#F44336" } },
    ];

    // First create all the nodes and links
    devices.forEach((device) => {
      const isCoordinator = device.device_type === "Coordinator";
      // Determine category (Coordinator, Router, End Device)
      let category: number;
      if (!device.available) {
        category = 3; // Offline
      } else if (isCoordinator) {
        category = 0;
      } else if (device.device_type === "Router") {
        category = 1;
      } else {
        category = 2; // End Device
      }

      // Create node
      nodes.push({
        id: device.ieee,
        name: device.user_given_name || device.name || device.ieee,
        category,
        value: isCoordinator ? 3 : device.device_type === "Router" ? 2 : 1,
        symbolSize: isCoordinator
          ? 40
          : device.device_type === "Router"
            ? 30
            : 20,
        symbol: isCoordinator ? "roundRect" : "circle",
        itemStyle: {
          color: device.available
            ? isCoordinator
              ? "#4CAF50"
              : device.device_type === "Router"
                ? "#2196F3"
                : "#9E9E9E"
            : "#F44336",
        },
        label: this._buildLabel(device),
        fixed: isCoordinator,
      });

      // Create links (edges)
      const existingLinks = links.filter(
        (link) => link.source === device.ieee || link.target === device.ieee
      );
      if (device.routes && device.routes.length > 0) {
        // Add all links, but mark only the strongest as non-ignored for force layout
        device.routes.forEach((route) => {
          const neighbor = device.neighbors.find(
            (n) => n.nwk === route.next_hop
          );
          if (!neighbor) {
            return;
          }
          const existingLink = existingLinks.find(
            (link) =>
              link.source === neighbor.ieee || link.target === neighbor.ieee
          );

          if (existingLink) {
            if (existingLink.source === device.ieee) {
              existingLink.value = Math.max(
                existingLink.value!,
                parseInt(neighbor.lqi)
              );
            } else {
              existingLink.reverseValue = Math.max(
                existingLink.reverseValue ?? 0,
                parseInt(neighbor.lqi)
              );
              existingLink.symbolSize = 1; // 0 doesn't work
            }
            existingLink.lineStyle = {
              ...existingLink.lineStyle,
              width: this._getLQIWidth(existingLink.value!),
              color:
                route.route_status === "Active"
                  ? "#17ab00"
                  : existingLink.lineStyle!.color,
              type: ["Child", "Parent"].includes(neighbor.relationship)
                ? "solid"
                : existingLink.lineStyle!.type,
            };
          } else {
            // Create a new link
            const width = this._getLQIWidth(parseInt(neighbor.lqi));
            const link: NetworkLink = {
              source: device.ieee,
              target: neighbor.ieee,
              value: parseInt(neighbor.lqi),
              lineStyle: {
                width,
                color: route.route_status === "Active" ? "#17ab00" : "#fc4c4c",
                type: ["Child", "Parent"].includes(neighbor.relationship)
                  ? "solid"
                  : "dashed",
              },
              symbolSize: width * 2,
              // By default, all links should be ignored for force layout
              ignoreForceLayout: !isCoordinator,
            };
            links.push(link);
            existingLinks.push(link);
          }
        });
      } else if (existingLinks.length === 0) {
        // If there are no links, create a link to the closest neighbor
        const neighbors: { ieee: string; lqi: string }[] =
          device.neighbors ?? [];
        if (neighbors.length === 0) {
          // If there are no neighbors, look for links from other devices
          devices.forEach((d) => {
            if (d.neighbors && d.neighbors.length > 0) {
              const neighbor = d.neighbors.find((n) => n.ieee === device.ieee);
              if (neighbor) {
                neighbors.push({ ieee: d.ieee, lqi: neighbor.lqi });
              }
            }
          });
        }
        const closestNeighbor = neighbors.sort(
          (a, b) => parseInt(b.lqi) - parseInt(a.lqi)
        )[0];
        if (closestNeighbor) {
          links.push({
            source: device.ieee,
            target: closestNeighbor.ieee,
            value: parseInt(closestNeighbor.lqi),
            lineStyle: {
              width: 1,
              color: "#bfbfbf",
              type: "dotted",
            },
            ignoreForceLayout: false,
          });
        }
      }
    });

    // Now set ignoreForceLayout to false for the strongest connection of each device
    // Except for the coordinator which can have multiple strong connections
    devices.forEach((device) => {
      if (device.device_type === "Coordinator") {
        links.forEach((link) => {
          if (link.source === device.ieee || link.target === device.ieee) {
            link.ignoreForceLayout = false;
          }
        });
      } else {
        // Find the link that corresponds to this strongest connection
        let strongestLink: NetworkLink | undefined;
        links.forEach((link) => {
          if (
            (link.source === device.ieee || link.target === device.ieee) &&
            link.value! > (strongestLink?.value ?? 0)
          ) {
            strongestLink = link;
          }
        });

        if (strongestLink) {
          strongestLink.ignoreForceLayout = false;
        }
      }
    });

    return { nodes, links, categories };
  }

  private _getLQIWidth(lqi: number): number {
    return (lqi / 256) * 4;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-network-visualization-page": ZHANetworkVisualizationPage;
  }
}
