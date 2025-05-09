import "@material/mwc-button";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { Edge, EdgeOptions, Node } from "vis-network/peer/esm/vis-network";
import { Network } from "vis-network/peer/esm/vis-network";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/search-input";
import "../../../../../components/device/ha-device-picker";
import "../../../../../components/ha-button-menu";
import "../../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../../components/ha-checkbox";
import "../../../../../components/ha-formfield";
import "../../../../../components/chart/ha-network-graph";
import type {
  NetworkData,
  NetworkNode,
  NetworkLink,
} from "../../../../../components/chart/ha-network-graph";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import type { ZHADevice } from "../../../../../data/zha";
import { fetchDevices, refreshTopology } from "../../../../../data/zha";
import "../../../../../layouts/hass-tabs-subpage";
import type {
  ValueChangedEvent,
  HomeAssistant,
  Route,
} from "../../../../../types";
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

  @query("#visualization", true)
  private _visualization?: HTMLElement;

  @state()
  private _devices = new Map<string, ZHADevice>();

  @state()
  private _devicesByDeviceId = new Map<string, ZHADevice>();

  @state()
  private _nodes: Node[] = [];

  @state()
  private _networkData?: NetworkData;

  @state()
  private _network?: Network;

  @state()
  private _filter?: string;

  @state()
  private _useEcharts = true;

  private _autoZoom = true;

  private _enablePhysics = true;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);

    // prevent zoomedDeviceIdFromURL from being restored to zoomedDeviceId after the user clears it
    if (this.zoomedDeviceIdFromURL) {
      this.zoomedDeviceId = this.zoomedDeviceIdFromURL;
    }

    if (this.hass) {
      this._fetchData();
    }

    if (!this._useEcharts) {
      this._setupVisNetwork();
    }
  }

  private _setupVisNetwork(): void {
    this._network = new Network(
      this._visualization!,
      {},
      {
        autoResize: true,
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
          navigate(`/config/devices/device/${device.device_reg_id}`);
        }
      }
    });

    this._network.on("click", (properties) => {
      const ieee = properties.nodes[0];
      if (ieee) {
        const device = this._devices.get(ieee);
        if (device && this._autoZoom) {
          this.zoomedDeviceId = device.device_reg_id;
          this._zoomToDevice();
        }
      }
    });

    this._network.on("stabilized", () => {
      if (this.zoomedDeviceId) {
        this._zoomToDevice();
      }
    });
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
        ${this.narrow
          ? html`
              <div slot="header">
                <search-input
                  .hass=${this.hass}
                  class="header"
                  @value-changed=${this._handleSearchChange}
                  .filter=${this._filter}
                  .label=${this.hass.localize(
                    "ui.panel.config.zha.visualization.highlight_label"
                  )}
                >
                </search-input>
              </div>
            `
          : ""}
        <div class="header">
          ${!this.narrow
            ? html`<search-input
                .hass=${this.hass}
                @value-changed=${this._handleSearchChange}
                .filter=${this._filter}
                .label=${this.hass.localize(
                  "ui.panel.config.zha.visualization.highlight_label"
                )}
              ></search-input>`
            : ""}
          <ha-device-picker
            .hass=${this.hass}
            .value=${this.zoomedDeviceId}
            .label=${this.hass.localize(
              "ui.panel.config.zha.visualization.zoom_label"
            )}
            .deviceFilter=${this._filterDevices}
            @value-changed=${this._onZoomToDevice}
          ></ha-device-picker>
          <div class="controls">
            <ha-formfield
              .label=${this.hass!.localize(
                "ui.panel.config.zha.visualization.auto_zoom"
              )}
            >
              <ha-checkbox
                @change=${this._handleAutoZoomCheckboxChange}
                .checked=${this._autoZoom}
              >
              </ha-checkbox>
            </ha-formfield>
            ${!this._useEcharts
              ? html`
                  <ha-formfield
                    .label=${this.hass!.localize(
                      "ui.panel.config.zha.visualization.enable_physics"
                    )}
                    ><ha-checkbox
                      @change=${this._handlePhysicsCheckboxChange}
                      .checked=${this._enablePhysics}
                    >
                    </ha-checkbox
                  ></ha-formfield>
                `
              : ""}
            <ha-formfield .label=${"Use ECharts"}>
              <ha-checkbox
                @change=${this._handleEChartsToggle}
                .checked=${this._useEcharts}
              ></ha-checkbox>
            </ha-formfield>
            <mwc-button @click=${this._refreshTopology}>
              ${this.hass!.localize(
                "ui.panel.config.zha.visualization.refresh_topology"
              )}
            </mwc-button>
          </div>
        </div>

        ${this._useEcharts
          ? html`
              <ha-network-graph
                .hass=${this.hass}
                .data=${this._networkData}
                .selectedNode=${this._getSelectedNodeIEEE()}
                @node-selected=${this._handleNodeSelected}
                height="calc(100vh - 198px)"
              ></ha-network-graph>
            `
          : html`<div id="visualization"></div>`}
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

  private _handleEChartsToggle(ev: Event): void {
    this._useEcharts = (ev.target as HaCheckbox).checked;
    if (!this._useEcharts && !this._network) {
      this.updateComplete.then(() => {
        this._setupVisNetwork();
        if (this._nodes.length > 0) {
          this._network?.setData({
            nodes: this._nodes,
            edges: this._createEdges(),
          });
        }
      });
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
    this._nodes = [];

    // Create nodes for vis-network
    devices.forEach((device) => {
      this._nodes.push({
        id: device.ieee,
        label: this._buildLabel(device),
        shape: this._getShape(device),
        mass: this._getMass(device),
        fixed: device.device_type === "Coordinator",
        color: {
          background: device.available ? "#66FF99" : "#FF9999",
        },
      });
    });

    // Create network data for ECharts
    this._networkData = this._createEChartsData(devices);

    // Update vis-network if it's active
    if (!this._useEcharts && this._network) {
      this._network.setData({ nodes: this._nodes, edges: this._createEdges() });
    }
  }

  private _getEdgeOptions(lqi: number): EdgeOptions {
    const length = 2000 - 4 * lqi;
    if (lqi > 192) {
      return {
        color: { color: "#17ab00", highlight: "#17ab00" },
        width: lqi / 20,
        length: length,
        physics: false,
      };
    }
    if (lqi > 128) {
      return {
        color: { color: "#e6b402", highlight: "#e6b402" },
        width: 9,
        length: length,
        physics: false,
      };
    }
    return {
      color: { color: "#bfbfbf", highlight: "#bfbfbf" },
      width: 1,
      length: length,
      physics: false,
    };
  }

  private _getMass(device: ZHADevice): number {
    if (!device.available) {
      return 6;
    }
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
    if (device.area_id) {
      label += `\n<b>Area ID: </b>${device.area_id}`;
    }
    return label;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
    const filterText = this._filter!.toLowerCase();

    if (this._useEcharts) {
      // Filter handling for ECharts is handled by the component itself
      // We might want to pass the filter to the component in future
      return;
    }

    if (!this._network) {
      return;
    }
    if (this._filter) {
      const filteredNodeIds: (string | number)[] = [];
      this._nodes.forEach((node) => {
        if (node.label && node.label.toLowerCase().includes(filterText)) {
          filteredNodeIds.push(node.id!);
        }
      });
      this.zoomedDeviceId = "";
      this._zoomOut();
      this._network.selectNodes(filteredNodeIds, true);
    } else {
      this._network.unselectAll();
    }
  }

  private _onZoomToDevice(event: ValueChangedEvent<string>) {
    event.stopPropagation();
    this.zoomedDeviceId = event.detail.value;
    if (this._useEcharts) {
      // The ECharts component will handle the zooming based on selectedNode prop
      return;
    }
    if (!this._network) {
      return;
    }
    this._zoomToDevice();
  }

  private _zoomToDevice() {
    this._filter = "";
    if (!this.zoomedDeviceId) {
      this._zoomOut();
    } else {
      const device: ZHADevice | undefined = this._devicesByDeviceId.get(
        this.zoomedDeviceId
      );
      if (device) {
        this._network!.fit({
          nodes: [device.ieee],
          animation: { duration: 500, easingFunction: "easeInQuad" },
        });
      }
    }
  }

  private _zoomOut() {
    this._network!.fit({
      nodes: [],
      animation: { duration: 500, easingFunction: "easeOutQuad" },
    });
  }

  private async _refreshTopology(): Promise<void> {
    await refreshTopology(this.hass);
  }

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    if (!this.hass) {
      return false;
    }
    for (const parts of device.identifiers) {
      for (const part of parts) {
        if (part === "zha") {
          return true;
        }
      }
    }
    return false;
  };

  private _handleAutoZoomCheckboxChange(ev: Event) {
    this._autoZoom = (ev.target as HaCheckbox).checked;
  }

  private _handlePhysicsCheckboxChange(ev: Event) {
    this._enablePhysics = (ev.target as HaCheckbox).checked;

    this._network!.setOptions(
      this._enablePhysics
        ? { physics: { enabled: true } }
        : { physics: { enabled: false } }
    );
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .header {
          border-bottom: 1px solid var(--divider-color);
          padding: 0 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: var(--header-height);
          box-sizing: border-box;
        }

        .header > * {
          padding: 0 8px;
        }

        :host([narrow]) .header {
          flex-direction: column;
          align-items: stretch;
          height: var(--header-height) * 2;
        }

        .search-toolbar {
          display: flex;
          align-items: center;
          color: var(--secondary-text-color);
          padding: 0 16px;
        }

        search-input {
          flex: 1;
          display: block;
        }

        search-input.header {
          color: var(--secondary-text-color);
        }

        ha-device-picker {
          flex: 1;
        }

        .controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        #visualization {
          height: calc(100vh - 198px);
          width: 100%;
        }
        :host([narrow]) #visualization {
          height: calc(100vh - (var(--header-height) * 2) - 56px);
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
        symbolSize:
          device.device_type === "Coordinator"
            ? 40
            : device.device_type === "Router"
              ? 30
              : 20,
        symbol: device.device_type === "Coordinator" ? "rect" : "circle",
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
      if (device.neighbors && device.neighbors.length > 0) {
        // Add all links, but mark only the strongest as non-ignored for force layout
        device.neighbors.forEach((neighbor) => {
          // Check if the link exists in reverse direction
          const reverseLink = links.find(
            (link) =>
              link.source === neighbor.ieee && link.target === device.ieee
          );

          if (reverseLink) {
            // Update the existing link to be bidirectional
            reverseLink.lineStyle = {
              ...reverseLink.lineStyle,
              width: Math.max(
                Number(reverseLink.lineStyle?.width || 1),
                this._getLQIWidth(parseInt(neighbor.lqi))
              ),
            };
          } else {
            // Create a new link
            links.push({
              source: device.ieee,
              target: neighbor.ieee,
              value: parseInt(neighbor.lqi),
              lineStyle: {
                width: 1,
                color: this._getLQIColor(parseInt(neighbor.lqi)),
                type: neighbor.relationship !== "Child" ? "dashed" : "solid",
              },
              // By default, all links should be ignored for force layout
              ignoreForceLayout: true,
            });
          }
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
    if (lqi > 192) return 4;
    if (lqi > 128) return 3;
    if (lqi > 80) return 2;
    return 1;
  }

  private _getLQIColor(lqi: number): string {
    if (lqi > 192) return "#17ab00";
    if (lqi > 128) return "#e6b402";
    if (lqi > 80) return "#fc4c4c";
    return "#bfbfbf";
  }

  private _createEdges(): Edge[] {
    const edges: Edge[] = [];
    this._devices.forEach((device) => {
      if (device.neighbors && device.neighbors.length > 0) {
        device.neighbors.forEach((neighbor) => {
          const idx = edges.findIndex(
            (e) => device.ieee === e.to && neighbor.ieee === e.from
          );
          if (idx === -1) {
            const edge_options = this._getEdgeOptions(parseInt(neighbor.lqi));
            edges.push({
              from: device.ieee,
              to: neighbor.ieee,
              label: neighbor.lqi + "",
              color: edge_options.color,
              width: edge_options.width,
              length: edge_options.length,
              physics: edge_options.physics,
              arrows: {
                from: {
                  enabled: neighbor.relationship !== "Child",
                },
              },
              dashes: neighbor.relationship !== "Child",
            });
          } else {
            const edge_options = this._getEdgeOptions(
              Math.min(parseInt(edges[idx].label!), parseInt(neighbor.lqi))
            );
            edges[idx].label += " & " + neighbor.lqi;
            edges[idx].color = edge_options.color;
            edges[idx].width = edge_options.width;
            edges[idx].length = edge_options.length;
            edges[idx].physics = edge_options.physics;
            delete edges[idx].arrows;
            delete edges[idx].dashes;
          }
        });
      }
    });
    return edges;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-network-visualization-page": ZHANetworkVisualizationPage;
  }
}
