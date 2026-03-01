import { mdiRefresh } from "@mdi/js";
import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { getDeviceContext } from "../../../../../common/entity/context/get_device_context";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/chart/ha-network-graph";
import type { NetworkData } from "../../../../../components/chart/ha-network-graph";
import "../../../../../components/search-input-outlined";
import type { DeviceRegistryEntry } from "../../../../../data/device/device_registry";
import type { ZHADevice } from "../../../../../data/zha";
import { fetchDevices, refreshTopology } from "../../../../../data/zha";
import "../../../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../../../types";
import { formatAsPaddedHex } from "./functions";
import { createZHANetworkChartData } from "./zha-network-data";

@customElement("zha-network-visualization-page")
export class ZHANetworkVisualizationPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state()
  private _networkData: NetworkData = {
    nodes: [],
    links: [],
    categories: [],
  };

  @state()
  private _devices: ZHADevice[] = [];

  @state()
  private _searchFilter = "";

  @state()
  private _highlightedNodes?: Set<string>;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);

    if (this.hass) {
      this._fetchData();
    }
  }

  protected render() {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.zha.visualization.header"
        )}
      >
        <ha-network-graph
          .hass=${this.hass}
          .data=${this._networkData}
          .highlightedNodes=${this._highlightedNodes}
          .tooltipFormatter=${this._tooltipFormatter}
          @chart-click=${this._handleChartClick}
        >
          <search-input-outlined
            slot="search"
            .hass=${this.hass}
            .filter=${this._searchFilter}
            @value-changed=${this._handleSearchChange}
          ></search-input-outlined>
          <ha-icon-button
            slot="button"
            class="refresh-button"
            .path=${mdiRefresh}
            @click=${this._refreshTopology}
            label=${this.hass.localize(
              "ui.panel.config.zha.visualization.refresh_topology"
            )}
          ></ha-icon-button>
        </ha-network-graph>
      </hass-subpage>
    `;
  }

  private async _fetchData() {
    this._devices = await fetchDevices(this.hass!);
    this._networkData = createZHANetworkChartData(
      this._devices,
      this.hass,
      this
    );
  }

  private _handleSearchChange(ev: CustomEvent): void {
    const filter = ev.detail.value;
    this._searchFilter = filter;
    if (!filter) {
      this._highlightedNodes = undefined;
      return;
    }
    const lowerFilter = filter.toLowerCase();
    const matchingIds = new Set<string>();
    for (const device of this._devices) {
      if (this._deviceMatchesFilter(device, lowerFilter)) {
        matchingIds.add(device.ieee);
      }
    }
    this._highlightedNodes = matchingIds;
  }

  private _deviceMatchesFilter(
    device: ZHADevice,
    lowerFilter: string
  ): boolean {
    // Match against device name
    if (device.name?.toLowerCase().includes(lowerFilter)) {
      return true;
    }
    // Match against user given name
    if (device.user_given_name?.toLowerCase().includes(lowerFilter)) {
      return true;
    }
    // Match against IEEE address
    if (device.ieee?.toLowerCase().includes(lowerFilter)) {
      return true;
    }
    // Match against manufacturer
    if (device.manufacturer?.toLowerCase().includes(lowerFilter)) {
      return true;
    }
    // Match against model
    if (device.model?.toLowerCase().includes(lowerFilter)) {
      return true;
    }
    // Match against device type
    if (device.device_type?.toLowerCase().includes(lowerFilter)) {
      return true;
    }
    // Match against NWK address (hex format)
    if (
      device.nwk != null &&
      formatAsPaddedHex(device.nwk).toLowerCase().includes(lowerFilter)
    ) {
      return true;
    }
    // Match against area name
    const haDevice = this.hass.devices[device.device_reg_id] as
      | DeviceRegistryEntry
      | undefined;
    if (haDevice) {
      const area = getDeviceContext(haDevice, this.hass).area;
      if (area?.name?.toLowerCase().includes(lowerFilter)) {
        return true;
      }
    }
    return false;
  }

  private _tooltipFormatter = (params: TopLevelFormatterParams): string => {
    const { dataType, data, name } = params as CallbackDataParams;
    if (dataType === "edge") {
      const { source, target, value } = data as any;
      const targetName = this._networkData.nodes.find(
        (node) => node.id === target
      )!.name;
      const sourceName = this._networkData.nodes.find(
        (node) => node.id === source
      )!.name;
      const tooltipText = `${sourceName} → ${targetName}${value ? ` <b>LQI:</b> ${value}` : ""}`;

      const reverseValue = this._networkData.links.find(
        (link) => link.source === source && link.target === target
      )?.reverseValue;
      if (reverseValue) {
        return `${tooltipText}<br>${targetName} → ${sourceName} <b>LQI:</b> ${reverseValue}`;
      }
      return tooltipText;
    }
    const device = this._devices.find((d) => d.ieee === (data as any).id);
    if (!device) {
      return name;
    }
    let label = `<b>IEEE: </b>${device.ieee}`;
    label += `<br><b>${this.hass.localize("ui.panel.config.zha.visualization.device_type")}: </b>${device.device_type.replace("_", " ")}`;
    if (device.nwk != null) {
      label += `<br><b>NWK: </b>${formatAsPaddedHex(device.nwk)}`;
    }
    if (device.manufacturer != null && device.model != null) {
      label += `<br><b>${this.hass.localize("ui.panel.config.zha.visualization.device")}: </b>${device.manufacturer} ${device.model}`;
    } else {
      label += `<br><b>${this.hass.localize("ui.panel.config.zha.visualization.device_not_in_db")}</b>`;
    }
    const haDevice = this.hass.devices[device.device_reg_id] as
      | DeviceRegistryEntry
      | undefined;
    if (haDevice) {
      const area = getDeviceContext(haDevice, this.hass).area;
      if (area) {
        label += `<br><b>${this.hass.localize("ui.panel.config.zha.visualization.area")}: </b>${area.name}`;
      }
    }
    return label;
  };

  private async _refreshTopology(): Promise<void> {
    await refreshTopology(this.hass);
    await this._fetchData();
  }

  private _handleChartClick(e: CustomEvent): void {
    if (
      e.detail.dataType === "node" &&
      e.detail.event.target.cursor === "pointer"
    ) {
      const { id } = e.detail.data;
      const device = this._devices.find((d) => d.ieee === id);
      if (device) {
        navigate(`/config/devices/device/${device.device_reg_id}`);
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
    "zha-network-visualization-page": ZHANetworkVisualizationPage;
  }
}
