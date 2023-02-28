import { html, LitElement, PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";
import "../../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-circular-progress";
import "../../../../../components/ha-code-editor";
import { fetchDevices, ZHADevice } from "../../../../../data/zha";
import { HomeAssistant } from "../../../../../types";

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

  @property({ type: Boolean }) public narrow!: boolean;

  @property() public device: ZHADevice | undefined;

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
              grows: true,
            },
            lqi: {
              title: this.hass.localize("ui.panel.config.zha.neighbors.lqi"),
              sortable: true,
              filterable: true,
              type: "numeric",
              width: "75px",
            },
          }
        : {
            name: {
              title: this.hass.localize("ui.panel.config.zha.neighbors.name"),
              sortable: true,
              filterable: true,
              direction: "asc",
              grows: true,
            },
            lqi: {
              title: this.hass.localize("ui.panel.config.zha.neighbors.lqi"),
              sortable: true,
              filterable: true,
              type: "numeric",
              width: "75px",
            },
            relationship: {
              title: this.hass.localize(
                "ui.panel.config.zha.neighbors.relationship"
              ),
              sortable: true,
              filterable: true,
              width: "150px",
            },
            depth: {
              title: this.hass.localize("ui.panel.config.zha.neighbors.depth"),
              sortable: true,
              filterable: true,
              type: "numeric",
              width: "75px",
            },
          }
  );

  protected render() {
    if (!this.device) {
      return nothing;
    }
    return html`
      ${!this._devices
        ? html`<ha-circular-progress
            alt="Loading"
            size="large"
            active
          ></ha-circular-progress>`
        : html`<ha-data-table
            .hass=${this.hass}
            .columns=${this._columns(this.narrow)}
            .data=${this._deviceNeighbors(this.device, this._devices)}
            auto-height
            .dir=${computeRTLDirection(this.hass)}
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
