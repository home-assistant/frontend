import { mdiRefresh } from "@mdi/js";
import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { getDeviceContext } from "../../../../../common/entity/context/get_device_context";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/chart/ha-network-graph";
import type { NetworkData } from "../../../../../components/chart/ha-network-graph";
import "../../../../../components/input/ha-input-search";
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

  @state() private _searchFilter = "";

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
        ${this.narrow
          ? html`<div slot="header">${this._renderInputSearch()}</div>`
          : nothing}
        <ha-network-graph
          .hass=${this.hass}
          .searchFilter=${this._searchFilter}
          .data=${this._networkData}
          .searchableAttributes=${this._getSearchableAttributes}
          .tooltipFormatter=${this._tooltipFormatter}
          @chart-click=${this._handleChartClick}
        >
          ${!this.narrow ? this._renderInputSearch("search") : nothing}
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

  private _renderInputSearch(slot = "") {
    return html`<ha-input-search
      appearance="outlined"
      slot=${slot}
      .value=${this._searchFilter}
      @input=${this._handleSearchChange}
    ></ha-input-search>`;
  }

  private async _fetchData() {
    this._devices = await fetchDevices(this.hass!);
    this._networkData = createZHANetworkChartData(
      this._devices,
      this.hass,
      this
    );
  }

  private _getSearchableAttributes = (nodeId: string): string[] => {
    const device = this._devices.find((d) => d.ieee === nodeId);
    if (!device) {
      return [];
    }
    const attributes: string[] = [];
    if (device.user_given_name) {
      attributes.push(device.user_given_name);
    }
    if (device.manufacturer) {
      attributes.push(device.manufacturer);
    }
    if (device.model) {
      attributes.push(device.model);
    }
    if (device.device_type) {
      attributes.push(device.device_type);
    }
    if (device.nwk != null) {
      attributes.push(formatAsPaddedHex(device.nwk));
    }
    return attributes;
  };

  private _handleSearchChange(ev: InputEvent): void {
    this._searchFilter = (ev.target as HTMLInputElement).value;
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
        [slot="header"] {
          display: flex;
          align-items: center;
        }
        ha-input-search {
          flex: 1;
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
