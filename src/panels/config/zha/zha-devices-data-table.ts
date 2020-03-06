import "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-state-icon";

import memoizeOne from "memoize-one";

import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
  CSSResult,
  css,
} from "lit-element";
import { HomeAssistant } from "../../../types";
// tslint:disable-next-line
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
// tslint:disable-next-line
import { ZHADevice } from "../../../data/zha";
import { showZHADeviceInfoDialog } from "../../../dialogs/zha-device-info-dialog/show-dialog-zha-device-info";

export interface DeviceRowData extends ZHADevice {
  device?: DeviceRowData;
}

@customElement("zha-devices-data-table")
export class ZHADevicesDataTable extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow = false;
  @property({ type: Boolean }) public selectable = false;
  @property() public devices: ZHADevice[] = [];

  private _devices = memoizeOne((devices: ZHADevice[]) => {
    let outputDevices: DeviceRowData[] = devices;

    outputDevices = outputDevices.map((device) => {
      return {
        ...device,
        name: device.user_given_name || device.name,
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
              grows: true,
              template: (name) => html`
                <div @click=${this._handleClicked} style="cursor: pointer;">
                  ${name}
                </div>
              `,
            },
          }
        : {
            name: {
              title: "Name",
              sortable: true,
              filterable: true,
              direction: "asc",
              grows: true,
              template: (name) => html`
                <div @click=${this._handleClicked} style="cursor: pointer;">
                  ${name}
                </div>
              `,
            },
            manufacturer: {
              title: "Manufacturer",
              sortable: true,
              filterable: true,
              width: "20%",
            },
            model: {
              title: "Model",
              sortable: true,
              filterable: true,
              width: "20%",
            },
          }
  );

  protected render(): TemplateResult {
    return html`
      <ha-data-table
        .columns=${this._columns(this.narrow)}
        .data=${this._devices(this.devices)}
        .selectable=${this.selectable}
        auto-height
      ></ha-data-table>
    `;
  }

  private async _handleClicked(ev: CustomEvent) {
    const ieee = (ev.target as HTMLElement)
      .closest("tr")!
      .getAttribute("data-row-id")!;
    showZHADeviceInfoDialog(this, { ieee });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-devices-data-table": ZHADevicesDataTable;
  }
}
