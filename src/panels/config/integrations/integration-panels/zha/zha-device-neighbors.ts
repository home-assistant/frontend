import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-code-editor";
import type { ZHADevice } from "../../../../../data/zha";
import { fetchDevices } from "../../../../../data/zha";
import type { HomeAssistant } from "../../../../../types";

export interface DeviceRowData extends DataTableRowData {
  id: string;
  name: string;
  lqi: number;
  depth: number;
  relationship: string;
}

@customElement("zha-device-neighbors")
class ZHADeviceNeighbors extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public device?: ZHADevice;

  @state() private _devices: Map<string, ZHADevice> | undefined;

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (this.hass && changedProperties.has("device")) {
      this._fetchData();
    }
  }

  private _deviceNeighbors = memoizeOne(
    (
      device: ZHADevice | undefined,
      devices: Map<string, ZHADevice> | undefined
    ) => {
      const outputDevices: DeviceRowData[] = [];
      if (device && devices) {
        device.neighbors.forEach((neighbor) => {
          const zhaDevice: ZHADevice | undefined = devices.get(neighbor.ieee);
          if (zhaDevice) {
            outputDevices.push({
              name: zhaDevice.user_given_name || zhaDevice.name,
              id: zhaDevice.device_reg_id,
              lqi: parseInt(neighbor.lqi),
              depth: parseInt(neighbor.depth),
              relationship: neighbor.relationship,
            });
          }
        });
      }
      return outputDevices;
    }
  );

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            name: {
              title: this.hass.localize("ui.panel.config.zha.neighbors.name"),
              sortable: true,
              filterable: true,
              direction: "asc",
              flex: 2,
            },
            lqi: {
              title: this.hass.localize("ui.panel.config.zha.neighbors.lqi"),
              sortable: true,
              filterable: true,
              type: "numeric",
            },
          }
        : {
            name: {
              title: this.hass.localize("ui.panel.config.zha.neighbors.name"),
              sortable: true,
              filterable: true,
              direction: "asc",
              flex: 2,
            },
            lqi: {
              title: this.hass.localize("ui.panel.config.zha.neighbors.lqi"),
              sortable: true,
              filterable: true,
              type: "numeric",
            },
            relationship: {
              title: this.hass.localize(
                "ui.panel.config.zha.neighbors.relationship"
              ),
              sortable: true,
              filterable: true,
            },
            depth: {
              title: this.hass.localize("ui.panel.config.zha.neighbors.depth"),
              sortable: true,
              filterable: true,
              type: "numeric",
            },
          }
  );

  protected render() {
    if (!this.device) {
      return nothing;
    }
    return html`
      ${!this._devices
        ? html`<ha-spinner size="large"></ha-spinner>`
        : html`<ha-data-table
            .hass=${this.hass}
            .columns=${this._columns(this.narrow)}
            .data=${this._deviceNeighbors(this.device, this._devices)}
            auto-height
            .searchLabel=${this.hass.localize(
              "ui.components.data-table.search"
            )}
            .noDataText=${this.hass.localize(
              "ui.components.data-table.no-data"
            )}
          ></ha-data-table>`}
    `;
  }

  private async _fetchData(): Promise<void> {
    if (this.device && this.hass) {
      const devices = await fetchDevices(this.hass!);
      this._devices = new Map(
        devices.map((device: ZHADevice) => [device.ieee, device])
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-neighbors": ZHADeviceNeighbors;
  }
}
