import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import {
  Edge,
  EdgeOptions,
  Network,
  Node,
} from "vis-network/peer/esm/vis-network";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/search-input";
import "../../../../../components/device/ha-device-picker";
import "../../../../../components/ha-button-menu";
import "../../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../../components/ha-checkbox";
import "../../../../../components/ha-formfield";
import { DeviceRegistryEntry } from "../../../../../data/device_registry";
import {
  fetchDevices,
  refreshTopology,
  ZHADevice,
} from "../../../../../data/zha";
import "../../../../../layouts/hass-tabs-subpage";
import { ValueChangedEvent } from "../../../../../types";
import type { HomeAssistant, Route } from "../../../../../types";
import { formatAsPaddedHex } from "./functions";
import { zhaTabs } from "./zha-config-dashboard";

@customElement("zha-network-visualization-page")
export class ZHANetworkVisualizationPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property()
  public zoomedDeviceIdFromURL?: string;

  @state()
  private zoomedDeviceId?: string;

  @query("#visualization", true)
  private _visualization?: HTMLElement;

  @state()
  private _devices: Map<string, ZHADevice> = new Map();

  @state()
  private _devicesByDeviceId: Map<string, ZHADevice> = new Map();

  @state()
  private _nodes: Node[] = [];

  @state()
  private _network?: Network;

  @state()
  private _filter?: string;

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
            <mwc-button @click=${this._refreshTopology}>
              ${this.hass!.localize(
                "ui.panel.config.zha.visualization.refresh_topology"
              )}
            </mwc-button>
          </div>
        </div>
        <div id="visualization"></div>
      </hass-tabs-subpage>
    `;
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
          const idx = edges.findIndex(
            (e) => device.ieee === e.to && neighbor.ieee === e.from
          );
          if (idx === -1) {
            edges.push({
              from: device.ieee,
              to: neighbor.ieee,
              label: neighbor.lqi + "",
              color: this._getLQI(parseInt(neighbor.lqi)),
            });
          } else {
            edges[idx].color = this._getLQI(
              (parseInt(edges[idx].label!) + parseInt(neighbor.lqi)) / 2
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
    this._filter = ev.detail.value;
    const filterText = this._filter!.toLowerCase();
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
        ? {
            physics: {
              barnesHut: {
                springConstant: 0,
                avoidOverlap: 10,
                damping: 0.09,
              },
            },
          }
        : { physics: false }
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
          height: calc(100% - var(--header-height));
          width: 100%;
        }
        :host([narrow]) #visualization {
          height: calc(100% - (var(--header-height) * 2));
        }
      `,
    ];
  }
}
