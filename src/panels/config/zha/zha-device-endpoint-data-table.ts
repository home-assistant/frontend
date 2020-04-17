import {
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import "../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  HaDataTable,
  DataTableRowData,
} from "../../../components/data-table/ha-data-table";
import "../../../components/entity/ha-state-icon";
import type { ZHADeviceEndpoints, ZHAEntityReference } from "../../../data/zha";
import { showZHADeviceInfoDialog } from "../../../dialogs/zha-device-info-dialog/show-dialog-zha-device-info";
import type { HomeAssistant } from "../../../types";

export interface DeviceEndpointRowData extends DataTableRowData {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  endpoint: number;
  entities: ZHAEntityReference[];
}

@customElement("zha-device-endpoint-data-table")
export class ZHADeviceEndpointDataTable extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public selectable = false;

  @property({ type: Array }) public deviceEndpoints: ZHADeviceEndpoints[] = [];

  @query("ha-data-table") private _dataTable!: HaDataTable;

  private _deviceEndpoints = memoizeOne(
    (deviceEndpoints: ZHADeviceEndpoints[]) => {
      const outputDevices: DeviceEndpointRowData[] = [];

      deviceEndpoints.forEach((deviceEndpoint) => {
        deviceEndpoint.endpoints.forEach((endpoint) => {
          outputDevices.push({
            name:
              deviceEndpoint.device.user_given_name ||
              deviceEndpoint.device.name,
            model: deviceEndpoint.device.model,
            manufacturer: deviceEndpoint.device.manufacturer,
            id: deviceEndpoint.device.ieee,
            endpoint: endpoint.endpoint,
            entities: endpoint.entities,
          });
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
              template: (name) => html`
                <div @click=${this._handleClicked} style="cursor: pointer;">
                  ${name}
                </div>
              `,
            },
            endpoint: {
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
              template: (name) => html`
                <div @click=${this._handleClicked} style="cursor: pointer;">
                  ${name}
                </div>
              `,
            },
            endpoint: {
              title: "Endpoint",
              sortable: true,
              filterable: true,
            },
            entities: {
              title: "Associated Entities",
              sortable: false,
              filterable: false,
              width: "50%",
              template: (entities) => html`
                <div>
                  ${entities.length
                    ? entities.map(
                        (entity) =>
                          html` ${entity.name || entity.original_name} <br />`
                      )
                    : html`
                        <p>
                          This endpoint has no associated entities
                        </p>
                      `}
                </div>
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
        .columns=${this._columns(this.narrow)}
        .data=${this._deviceEndpoints(this.deviceEndpoints)}
        .selectable=${this.selectable}
        auto-height
      ></ha-data-table>
    `;
  }

  private async _handleClicked(ev: CustomEvent) {
    const ieee = ((ev.target as HTMLElement).closest(
      ".mdc-data-table__row"
    ) as any).rowId;
    showZHADeviceInfoDialog(this, { ieee });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-device-endpoint-data-table": ZHADeviceEndpointDataTable;
  }
}
