import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";
import "../../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  HaDataTable,
} from "../../../../../components/data-table/ha-data-table";
import type {
  ZHADeviceEndpoint,
  ZHAEntityReference,
} from "../../../../../data/zha";
import type { HomeAssistant } from "../../../../../types";

export interface DeviceEndpointRowData extends DataTableRowData {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  endpoint_id: number;
  entities: ZHAEntityReference[];
}

@customElement("zha-device-endpoint-data-table")
export class ZHADeviceEndpointDataTable extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public selectable = false;

  @property({ type: Array }) public deviceEndpoints: ZHADeviceEndpoint[] = [];

  @query("ha-data-table", true) private _dataTable!: HaDataTable;

  private _deviceEndpoints = memoizeOne(
    (deviceEndpoints: ZHADeviceEndpoint[]) => {
      const outputDevices: DeviceEndpointRowData[] = [];

      deviceEndpoints.forEach((deviceEndpoint) => {
        outputDevices.push({
          name:
            deviceEndpoint.device.user_given_name || deviceEndpoint.device.name,
          model: deviceEndpoint.device.model,
          manufacturer: deviceEndpoint.device.manufacturer,
          id: deviceEndpoint.device.ieee + "_" + deviceEndpoint.endpoint_id,
          ieee: deviceEndpoint.device.ieee,
          endpoint_id: deviceEndpoint.endpoint_id,
          entities: deviceEndpoint.entities,
          dev_id: deviceEndpoint.device.device_reg_id,
        });
      });

      return outputDevices;
    }
  );

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
              template: (device) => html`
                <a href=${`/config/devices/device/${device.dev_id}`}>
                  ${device.name}
                </a>
              `,
            },
            endpoint_id: {
              title: "Endpoint",
              sortable: true,
              filterable: true,
            },
          }
        : {
            name: {
              title: "Name",
              sortable: true,
              filterable: true,
              direction: "asc",
              grows: true,
              template: (device) => html`
                <a href=${`/config/devices/device/${device.dev_id}`}>
                  ${device.name}
                </a>
              `,
            },
            endpoint_id: {
              title: "Endpoint",
              sortable: true,
              filterable: true,
            },
            entities: {
              title: "Associated Entities",
              sortable: false,
              filterable: false,
              width: "50%",
              template: (device) => html`
                ${device.entities.length
                  ? device.entities.length > 3
                    ? html`${device.entities
                          .slice(0, 2)
                          .map(
                            (entity) =>
                              html`<div
                                style="overflow: hidden; text-overflow: ellipsis;"
                              >
                                ${entity.name || entity.original_name}
                              </div>`
                          )}
                        <div>And ${device.entities.length - 2} more...</div>`
                    : device.entities.map(
                        (entity) =>
                          html`<div
                            style="overflow: hidden; text-overflow: ellipsis;"
                          >
                            ${entity.name || entity.original_name}
                          </div>`
                      )
                  : "This endpoint has no associated entities"}
              `,
            },
          }
  );

  public clearSelection() {
    this._dataTable.clearSelection();
  }

  protected render(): TemplateResult {
    return html`
      <ha-data-table
        .hass=${this.hass}
        .columns=${this._columns(this.narrow)}
        .data=${this._deviceEndpoints(this.deviceEndpoints)}
        .selectable=${this.selectable}
        auto-height
        .dir=${computeRTLDirection(this.hass)}
        .searchLabel=${this.hass.localize("ui.components.data-table.search")}
        .noDataText=${this.hass.localize("ui.components.data-table.no-data")}
      ></ha-data-table>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .table-cell-text {
          word-break: break-word;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-endpoint-data-table": ZHADeviceEndpointDataTable;
  }
}
