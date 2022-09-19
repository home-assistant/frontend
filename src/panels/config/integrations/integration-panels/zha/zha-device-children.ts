import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import memoizeOne from "memoize-one";
import { customElement, property, state } from "lit/decorators";
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";
import "../../../../../components/ha-code-editor";
import { HomeAssistant } from "../../../../../types";
import "../../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-circular-progress";
import { fetchDevices, ZHADevice } from "../../../../../data/zha";

export interface DeviceRowData extends DataTableRowData {
  id: string;
  name: string;
  lqi: number;
}

@customElement("zha-device-children")
class ZHADeviceChildren extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device: ZHADevice | undefined;

  @state() private _devices: Map<string, ZHADevice> | undefined;

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (this.hass && changedProperties.has("device")) {
      this._fetchData();
    }
  }

  private _deviceChildren = memoizeOne(
    (
      device: ZHADevice | undefined,
      devices: Map<string, ZHADevice> | undefined
    ) => {
      const outputDevices: DeviceRowData[] = [];
      if (device && devices) {
        device.neighbors.forEach((child) => {
          const zhaDevice: ZHADevice | undefined = devices.get(child.ieee);
          if (zhaDevice) {
            outputDevices.push({
              name: zhaDevice.user_given_name || zhaDevice.name,
              id: zhaDevice.device_reg_id,
              lqi: parseInt(child.lqi),
            });
          }
        });
      }
      return outputDevices;
    }
  );

  private _columns: DataTableColumnContainer = {
    name: {
      title: "Name",
      sortable: true,
      filterable: true,
      direction: "asc",
      grows: true,
    },
    lqi: {
      title: "LQI",
      sortable: true,
      filterable: true,
      type: "numeric",
      width: "75px",
    },
  };

  protected render(): TemplateResult {
    if (!this.device) {
      return html``;
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
            .columns=${this._columns}
            .data=${this._deviceChildren(this.device, this._devices)}
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
    "zha-device-children": ZHADeviceChildren;
  }
}
