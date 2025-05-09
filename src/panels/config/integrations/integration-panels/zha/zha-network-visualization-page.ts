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

  @property({ attribute: false })
  public zoomedDeviceIdFromURL?: string;

  @state()
  private zoomedDeviceId?: string;

  @state()
  private _devices = new Map<string, ZHADevice>();

  @state()
  private _devicesByDeviceId = new Map<string, ZHADevice>();

  @state()
  private _networkData?: NetworkData;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);

    // prevent zoomedDeviceIdFromURL from being restored to zoomedDeviceId after the user clears it
    if (this.zoomedDeviceIdFromURL) {
      this.zoomedDeviceId = this.zoomedDeviceIdFromURL;
    }

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
          .selectedNode=${this._getSelectedNodeIEEE()}
          @node-selected=${this._handleNodeSelected}
          height="calc(100vh - 112px)"
        ></ha-network-graph>
      </hass-tabs-subpage>
    `;
  }

  private _getSelectedNodeIEEE(): string | undefined {
    if (
      !this.zoomedDeviceId ||
      !this._devicesByDeviceId.has(this.zoomedDeviceId)
    ) {
      return undefined;
    }
    return this._devicesByDeviceId.get(this.zoomedDeviceId)?.ieee;
  }

  private _handleNodeSelected(ev: CustomEvent): void {
    const ieee = ev.detail.id;
    if (ieee) {
      const device = this._devices.get(ieee);
      if (device) {
        this.zoomedDeviceId = device.device_reg_id;
      }
    }
  }

  private async _fetchData() {
    const devices = await fetchDevices(this.hass!);
    this._devices = new Map(
      devices.map((device: ZHADevice) => [device.ieee, device])
    );
    this._devicesByDeviceId = new Map(
      devices.map((device: ZHADevice) => [device.device_reg_id, device])
    );
    this._updateDevices(devices);
  }

  private _updateDevices(devices: ZHADevice[]) {
    // Create network data for ECharts
    this._networkData = this._createEChartsData(devices);
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

  private _createEChartsData(devices: ZHADevice[]): NetworkData {
    const nodes: NetworkNode[] = [];
    const links: NetworkLink[] = [];
    const categories = [
      { name: "Coordinator" },
      { name: "Router" },
      { name: "End Device" },
      { name: "Offline" },
    ];

    // First create all the nodes and links
    devices.forEach((device) => {
      // Determine category (Coordinator, Router, End Device)
      let category: number;
      if (!device.available) {
        category = 3; // Offline
      } else if (device.device_type === "Coordinator") {
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
        value:
          device.device_type === "Coordinator" ? 3 : device.available ? 2 : 1,
        symbolSize:
          device.device_type === "Coordinator"
            ? 40
            : device.device_type === "Router"
              ? 30
              : 20,
        symbol: device.device_type === "Coordinator" ? "roundRect" : "circle",
        itemStyle: {
          color: device.available
            ? device.device_type === "Coordinator"
              ? "#4CAF50"
              : device.device_type === "Router"
                ? "#2196F3"
                : "#9E9E9E"
            : "#F44336",
        },
        label: this._buildLabel(device),
        fixed: device.device_type === "Coordinator",
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
            // Update the existing link to be bidirectional
            existingLink.value = Math.max(
              existingLink.value!,
              parseInt(neighbor.lqi)
            );
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
            const link: NetworkLink = {
              source: device.ieee,
              target: neighbor.ieee,
              value: parseInt(neighbor.lqi),
              lineStyle: {
                width: this._getLQIWidth(parseInt(neighbor.lqi)),
                color: route.route_status === "Active" ? "#17ab00" : "#fc4c4c",
                type: ["Child", "Parent"].includes(neighbor.relationship)
                  ? "solid"
                  : "dashed",
              },
              // By default, all links should be ignored for force layout
              ignoreForceLayout: true,
            };
            links.push(link);
            existingLinks.push(link);
          }
        });
      } else if (
        existingLinks.length === 0 &&
        device.neighbors &&
        device.neighbors.length > 0
      ) {
        const closestNeighbor = device.neighbors.sort(
          (a, b) => parseInt(b.lqi) - parseInt(a.lqi)
        )[0];
        links.push({
          source: device.ieee,
          target: closestNeighbor.ieee,
          value: parseInt(closestNeighbor.lqi),
          lineStyle: {
            width: 1,
            color: "#bfbfbf",
            type: "dotted",
          },
          ignoreForceLayout: true,
        });
      }
    });

    // Now set ignoreForceLayout to false for the strongest connection of each device
    // Except for the coordinator which can have multiple strong connections
    devices.forEach((device) => {
      if (device.neighbors && device.neighbors.length > 0) {
        // Find the strongest neighbor for this device
        const strongestNeighbor = [...device.neighbors].sort(
          (a, b) => parseInt(b.lqi) - parseInt(a.lqi)
        )[0];

        // Find the link that corresponds to this strongest connection
        const strongestLink = links.find(
          (link) =>
            (link.source === device.ieee &&
              link.target === strongestNeighbor.ieee) ||
            (link.target === device.ieee &&
              link.source === strongestNeighbor.ieee)
        );

        if (strongestLink) {
          // For the coordinator, allow multiple strong connections
          if (device.device_type === "Coordinator") {
            strongestLink.ignoreForceLayout = false;
          } else {
            // For non-coordinators, check if they have a direct connection to the coordinator
            const coordinatorDevice = devices.find(
              (d) => d.device_type === "Coordinator"
            );
            if (coordinatorDevice) {
              const directCoordinatorLink = links.find(
                (link) =>
                  (link.source === device.ieee &&
                    link.target === coordinatorDevice.ieee) ||
                  (link.target === device.ieee &&
                    link.source === coordinatorDevice.ieee)
              );

              // If device has a direct connection to coordinator, prioritize that one
              if (directCoordinatorLink) {
                directCoordinatorLink.ignoreForceLayout = false;
                directCoordinatorLink.lineStyle = {
                  ...directCoordinatorLink.lineStyle,
                  width: 4,
                };
              } else {
                // Otherwise use the strongest connection
                // If this is already the strongest connection for the neighbor, keep it
                const neighborDevice = devices.find(
                  (d) => d.ieee === strongestNeighbor.ieee
                );
                if (neighborDevice) {
                  const neighborStrongestNeighbor = neighborDevice.neighbors
                    ? [...neighborDevice.neighbors].sort(
                        (a, b) => parseInt(b.lqi) - parseInt(a.lqi)
                      )[0]
                    : null;

                  if (
                    neighborStrongestNeighbor &&
                    neighborStrongestNeighbor.ieee === device.ieee
                  ) {
                    strongestLink.ignoreForceLayout = false;
                    strongestLink.lineStyle = {
                      ...strongestLink.lineStyle,
                      width: 4,
                    };
                  }
                }
              }
            }
          }
        }
      }
    });

    return { nodes, links, categories };
  }

  private _getLQIWidth(lqi: number): number {
    return Math.max((lqi / 256) * 5, 1);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-network-visualization-page": ZHANetworkVisualizationPage;
  }
}
