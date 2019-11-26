import "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-state-icon";

import memoizeOne from "memoize-one";

import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
} from "lit-element";
import { HomeAssistant } from "../../../types";
// tslint:disable-next-line
import {
  DataTableColumnContainer,
  DataTableRowData,
} from "../../../components/data-table/ha-data-table";
// tslint:disable-next-line
import { ZHADevice } from "../../../data/zha";

export interface DeviceRowData extends ZHADevice {
  device?: DeviceRowData;
}

@customElement("zha-devices-data-table")
export class ZHADevicesDataTable extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow = false;
  @property() public selectable = false;
  @property() public devices: ZHADevice[] = [];

  private _devices = memoizeOne((devices: ZHADevice[]) => {
    let outputDevices: DeviceRowData[] = devices;

    outputDevices = outputDevices.map((device) => {
      return {
        ...device,
        name: device.name,
        model: device.model,
        manufacturer: device.manufacturer,
        id: device.ieee,
      };
    });

    return outputDevices;
  });

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            name: {
              title: "Devices",
              sortable: true,
              filterable: true,
              direction: "asc",
              template: (name: DataTableRowData) => {
                return html`
                  ${name}<br />
                `;
              },
            },
          }
        : {
            name: {
              title: "Name",
              sortable: true,
              filterable: true,
              direction: "asc",
            },
            manufacturer: {
              title: "Manufacturer",
              sortable: true,
              filterable: true,
              direction: "asc",
            },
            model: {
              title: "Model",
              sortable: true,
              filterable: true,
              direction: "asc",
            },
          }
  );

  protected render(): TemplateResult {
    return html`
      <ha-data-table
        .columns=${this._columns(this.narrow)}
        .data=${this._devices(this.devices)}
        .selectable=${this.selectable}
      ></ha-data-table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-devices-data-table": ZHADevicesDataTable;
  }
}
